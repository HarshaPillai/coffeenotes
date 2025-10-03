"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

type Note = {
  id: string
  type: "rambling" | "good-advice" | "bad-advice" | "list"
  content: string
  position_x: number
  position_y: number
  created_at: string
  likes?: number
  user_id?: string
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
  onNoteUpdated,
}: {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
  onNoteUpdated: (note: Note) => void
}) {
  const parseContent = () => {
    try {
      return JSON.parse(note.content)
    } catch {
      return { text: note.content }
    }
  }

  const contentData = parseContent()
  const [text, setText] = useState(contentData.text || "")
  const [title, setTitle] = useState(contentData.title || "")
  const [items, setItems] = useState<string[]>(contentData.items || [""])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (focusIndex !== null && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus()
      setFocusIndex(null)
    }
  }, [focusIndex, items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    let updatedContent
    if (note.type === "list") {
      updatedContent = JSON.stringify({
        title,
        items: items.filter((item) => item.trim() !== ""),
        source: contentData.source,
      })
    } else {
      updatedContent = JSON.stringify({
        text,
        source: contentData.source,
      })
    }

    console.log("[v0] Saving note with content:", updatedContent)

    try {
      const response = await fetch("/api/notes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          content: updatedContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Save failed:", errorData)
        setError(errorData.error || "Failed to save changes")
        setIsSubmitting(false)
        return
      }

      const updatedNote = await response.json()
      console.log("[v0] Note saved successfully:", updatedNote)
      onNoteUpdated(updatedNote)
      onOpenChange(false)
    } catch (err) {
      console.error("[v0] Save error:", err)
      setError("Failed to save changes. Please try again.")
    }

    setIsSubmitting(false)
  }

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const newItems = [...items]
      newItems.splice(index + 1, 0, "")
      setItems(newItems)
      setFocusIndex(index + 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-[#3d3226] bg-[#faf8f3]">
        <DialogHeader>
          <DialogTitle className="text-2xl handwritten text-[#3d3226]">Edit Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-2 rounded">{error}</div>}

          {note.type === "list" ? (
            <>
              <div>
                <Label htmlFor="title" className="text-[#3d3226]">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 border-[#d4c5b0]"
                  required
                />
              </div>
              <div>
                <Label className="text-[#3d3226]">Items</Label>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      ref={(el) => {
                        inputRefs.current[index] = el
                      }}
                      value={item}
                      onChange={(e) => {
                        const newItems = [...items]
                        newItems[index] = e.target.value
                        setItems(newItems)
                      }}
                      onKeyDown={(e) => handleItemKeyDown(e, index)}
                      className="border-2 border-[#d4c5b0]"
                      placeholder={`Item ${index + 1}`}
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setItems([...items, ""])
                    setFocusIndex(items.length)
                  }}
                  className="mt-2"
                >
                  Add Item
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="text" className="text-[#3d3226]">
                Note Text
              </Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="border-2 border-[#d4c5b0] min-h-[150px]"
                required
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#f4e4c1] hover:bg-[#e8d4a8] text-[#3d3226] border-2 border-[#3d3226] handwritten"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
