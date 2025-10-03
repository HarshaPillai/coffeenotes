import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { noteIds, sessionId } = await request.json()

    if (!noteIds || !sessionId) {
      return NextResponse.json({ error: "Note IDs and session ID are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all likes for this user for the given notes
    const { data: likes, error } = await supabase
      .from("note_likes")
      .select("note_id")
      .eq("session_id", sessionId)
      .in("note_id", noteIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return a map of note_id -> isLiked
    const likedNotes = likes.reduce(
      (acc, like) => {
        acc[like.note_id] = true
        return acc
      },
      {} as Record<string, boolean>,
    )

    return NextResponse.json({ likedNotes })
  } catch (error) {
    return NextResponse.json({ error: "Failed to check likes" }, { status: 500 })
  }
}
