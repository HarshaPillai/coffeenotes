"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"

type NoteType = "rambling" | "good-advice" | "bad-advice" | "list"

const noteTypeMetadata = {
  "good-advice": {
    title: "Actionable Advice",
    description: "Practical tips you can apply directly.",
    icon: "✓",
  },
  "bad-advice": {
    title: "Take with Caution",
    description: "This is advice that is more of a hot take: bold, controversial, and guaranteed to spark discussion.",
    icon: "!",
  },
  rambling: {
    title: "Reflections",
    description:
      "Could be your own takeaways, impressions, or things you're mulling over from the chat or reflections shared in the coffee chat by the other person.",
    icon: "?",
  },
  list: {
    title: "Resources & Tools",
    description: "Specific links, books, templates, or methods shared during the chat.",
    icon: "📚",
  },
}

export function AddNoteDialog({
  open,
  onOpenChange,
  onNoteAdded,
  sessionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNoteAdded: (note: any) => void
  sessionId: string
}) {
  const [selectedType, setSelectedType] = useState<NoteType | null>(null)
  const [content, setContent] = useState("")
  const [givenBy, setGivenBy] = useState("")
  const [givenByOther, setGivenByOther] = useState("")
  const [listTitle, setListTitle] = useState("")
  const [listItems, setListItems] = useState<string[]>([])
  const [currentItem, setCurrentItem] = useState("")

  const resetForm = () => {
    setSelectedType(null)
    setContent("")
    setGivenBy("")
    setGivenByOther("")
    setListTitle("")
    setListItems([])
    setCurrentItem("")
  }

  const handleSubmit = async () => {
    let formattedContent = content
    const finalGivenBy = givenBy === "Other" ? givenByOther : givenBy

    if (selectedType === "list") {
      formattedContent = JSON.stringify({
        title: listTitle,
        items: listItems,
        source: finalGivenBy,
      })
    } else if (selectedType?.includes("advice") && finalGivenBy) {
      formattedContent = JSON.stringify({
        text: content,
        source: finalGivenBy,
      })
    } else if (selectedType === "rambling" && finalGivenBy) {
      formattedContent = JSON.stringify({
        text: content,
        source: finalGivenBy,
      })
    }

    const noteData = {
      type: selectedType,
      content: formattedContent,
      position_x: Math.floor(Math.random() * 500 + 100),
      position_y: Math.floor(Math.random() * 400 + 150),
      sessionId,
    }

    const response = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noteData),
    })

    if (response.ok) {
      const newNote = await response.json()
      onNoteAdded(newNote)
      resetForm()
      onOpenChange(false)
    }
  }

  const addListItem = () => {
    if (currentItem.trim()) {
      setListItems([...listItems, currentItem.trim()])
      setCurrentItem("")
    }
  }

  const removeListItem = (index: number) => {
    setListItems(listItems.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#faf8f3] border-2 border-[#3d3226] max-w-md p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
          {selectedType && (
            <Button
              variant="ghost"
              onClick={() => setSelectedType(null)}
              className="text-sm text-[#6b5d4f] absolute top-4 left-4 z-10"
            >
              ← Change type
            </Button>
          )}

          <DialogHeader className={selectedType ? "pt-8" : ""}>
            {selectedType ? (
              <>
                <DialogTitle className="text-2xl handwritten text-[#3d3226]">
                  {noteTypeMetadata[selectedType].title}
                </DialogTitle>
                <DialogDescription className="text-sm handwritten text-[#6b5d4f]">
                  {noteTypeMetadata[selectedType].description}
                </DialogDescription>
              </>
            ) : (
              <DialogTitle className="text-2xl handwritten text-[#3d3226]">Add a New Note</DialogTitle>
            )}
          </DialogHeader>

          {!selectedType ? (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                onClick={() => setSelectedType("rambling")}
                className="h-24 bg-[#fff4d6] hover:bg-[#ffe8b3] text-[#3d3226] border-2 border-[#f4d35e] handwritten text-lg"
              >
                Reflections
              </Button>
              <Button
                onClick={() => setSelectedType("good-advice")}
                className="h-24 bg-[#d4f4dd] hover:bg-[#b8e8c5] text-[#3d3226] border-2 border-[#95d5b2] handwritten text-lg"
              >
                Actionable Advice ✓
              </Button>
              <Button
                onClick={() => setSelectedType("bad-advice")}
                className="h-24 bg-[#ffd6d6] hover:bg-[#ffb3b3] text-[#3d3226] border-2 border-[#ff9999] handwritten text-lg"
              >
                Take with Caution !
              </Button>
              <Button
                onClick={() => setSelectedType("list")}
                className="h-24 bg-[#d6e8ff] hover:bg-[#b3d4ff] text-[#3d3226] border-2 border-[#99c2ff] handwritten text-lg"
              >
                Resources & Tools
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {selectedType === "list" ? (
                <>
                  <div>
                    <Label className="handwritten text-[#3d3226]">List Title</Label>
                    <Input
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      placeholder="e.g., Books to Read"
                      className="handwritten bg-white border-2 border-[#3d3226]"
                    />
                  </div>

                  <div>
                    <Label className="handwritten text-[#3d3226]">Items</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentItem}
                        onChange={(e) => setCurrentItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addListItem()
                          }
                        }}
                        placeholder="Add an item"
                        className="handwritten bg-white border-2 border-[#3d3226]"
                      />
                      <Button onClick={addListItem} size="icon" type="button">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {listItems.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-white p-2 rounded border border-[#d4c5b0]"
                        >
                          <span className="handwritten text-sm break-words">{item}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeListItem(i)}
                            className="h-6 w-6"
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Label className="handwritten text-[#3d3226]">Given By</Label>
                    <Select value={givenBy} onValueChange={setGivenBy}>
                      <SelectTrigger className="handwritten bg-white border-2 border-[#3d3226]">
                        <SelectValue placeholder="Select who shared this" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#faf8f3] border-2 border-[#3d3226]">
                        <SelectItem value="Recruiter" className="handwritten">
                          Recruiter
                        </SelectItem>
                        <SelectItem value="Senior Designer" className="handwritten">
                          Senior Designer
                        </SelectItem>
                        <SelectItem value="Mid-Level Designer" className="handwritten">
                          Mid-Level Designer
                        </SelectItem>
                        <SelectItem value="Professor" className="handwritten">
                          Professor
                        </SelectItem>
                        <SelectItem value="Colleague" className="handwritten">
                          Colleague
                        </SelectItem>
                        <SelectItem value="Other" className="handwritten">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {givenBy === "Other" && (
                      <Input
                        value={givenByOther}
                        onChange={(e) => setGivenByOther(e.target.value)}
                        placeholder="Who shared this?"
                        className="handwritten bg-white border-2 border-[#3d3226] mt-2"
                      />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="handwritten text-[#3d3226]">Content</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your note..."
                      className="handwritten bg-white border-2 border-[#3d3226] min-h-32"
                    />
                  </div>

                  <div>
                    <Label className="handwritten text-[#3d3226]">Given By</Label>
                    {selectedType === "rambling" && (
                      <p className="text-xs text-[#6b5d4f] mb-2 handwritten">
                        your takeaways or reflections about the career journey you heard from
                      </p>
                    )}
                    <Select value={givenBy} onValueChange={setGivenBy}>
                      <SelectTrigger className="handwritten bg-white border-2 border-[#3d3226]">
                        <SelectValue placeholder="Select who gave this advice" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#faf8f3] border-2 border-[#3d3226]">
                        {selectedType === "rambling" && (
                          <SelectItem value="Myself" className="handwritten">
                            Myself
                          </SelectItem>
                        )}
                        <SelectItem value="Recruiter" className="handwritten">
                          Recruiter
                        </SelectItem>
                        <SelectItem value="Senior Designer" className="handwritten">
                          Senior Designer
                        </SelectItem>
                        <SelectItem value="Mid-Level Designer" className="handwritten">
                          Mid-Level Designer
                        </SelectItem>
                        <SelectItem value="Professor" className="handwritten">
                          Professor
                        </SelectItem>
                        <SelectItem value="Colleague" className="handwritten">
                          Colleague
                        </SelectItem>
                        <SelectItem value="Other" className="handwritten">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {givenBy === "Other" && (
                      <Input
                        value={givenByOther}
                        onChange={(e) => setGivenByOther(e.target.value)}
                        placeholder="Who gave this advice?"
                        className="handwritten bg-white border-2 border-[#3d3226] mt-2"
                      />
                    )}
                  </div>
                </>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  selectedType === "list"
                    ? !listTitle || listItems.length === 0 || !givenBy || (givenBy === "Other" && !givenByOther)
                    : !content || !givenBy || (givenBy === "Other" && !givenByOther)
                }
                className="w-full bg-[#3d3226] hover:bg-[#2d2419] text-white handwritten text-lg"
              >
                Add Note
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
