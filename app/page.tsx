import { createClient } from "@/lib/supabase/server"
import { BulletJournalGrid } from "@/components/bullet-journal-grid"

export default async function Home() {
  const supabase = await createClient()

  const { data: notes } = await supabase.from("notes").select("*").order("created_at", { ascending: false })

  return (
    <main className="min-h-screen bg-[#faf8f3] overflow-hidden">
      <BulletJournalGrid initialNotes={notes || []} />
    </main>
  )
}
