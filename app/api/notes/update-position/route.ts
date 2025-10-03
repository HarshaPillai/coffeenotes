import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { id, x, y } = await request.json()

  const { error } = await supabase
    .from("notes")
    .update({
      position_x: Math.floor(x),
      position_y: Math.floor(y),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
