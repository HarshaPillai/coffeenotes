import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { id, content } = await request.json()

  const { data, error } = await supabase.from("notes").update({ content }).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating note:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("[v0] Note updated successfully:", data)
  return NextResponse.json(data)
}
