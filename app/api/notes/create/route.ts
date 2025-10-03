import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const body = await request.json()
  const { sessionId, ...noteData } = body

  const { data, error } = await supabase
    .from("notes")
    .insert([{ ...noteData, session_id: sessionId }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
