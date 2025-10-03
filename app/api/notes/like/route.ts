import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { id, sessionId } = await request.json()

    if (!id || !sessionId) {
      return NextResponse.json({ error: "Note ID and session ID are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existingLike, error: checkError } = await supabase
      .from("note_likes")
      .select("id")
      .eq("note_id", id)
      .eq("session_id", sessionId)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existingLike) {
      // Unlike: Remove the like record and decrement counter
      const { error: deleteError } = await supabase.from("note_likes").delete().eq("id", existingLike.id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Decrement likes count
      const { data: note, error: fetchError } = await supabase.from("notes").select("likes").eq("id", id).single()

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      const { data: updateData, error: updateError } = await supabase
        .from("notes")
        .update({ likes: Math.max(0, (note.likes || 0) - 1) })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ likes: updateData.likes, isLiked: false })
    } else {
      // Like: Add like record and increment counter
      const { error: insertError } = await supabase.from("note_likes").insert({ note_id: id, session_id: sessionId })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      // Increment likes count
      const { data: note, error: fetchError } = await supabase.from("notes").select("likes").eq("id", id).single()

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      const { data: updateData, error: updateError } = await supabase
        .from("notes")
        .update({ likes: (note.likes || 0) + 1 })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ likes: updateData.likes, isLiked: true })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
