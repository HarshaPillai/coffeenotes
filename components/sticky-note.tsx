"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Trash2, GripVertical, Heart, Pencil, Copy, Check } from "lucide-react"
import { Button } from "./ui/button"
import { EditNoteDialog } from "./edit-note-dialog"

type Note = {
  id: string
  type: "rambling" | "good-advice" | "bad-advice" | "list"
  content: string
  position_x: number
  position_y: number
  created_at: string
  likes?: number
  session_id?: string
}

const noteColors = {
  rambling: "bg-[#fff4d6] border-[#f4d35e]",
  "good-advice": "bg-[#d4f4dd] border-[#95d5b2]",
  "bad-advice": "bg-[#ffd6d6] border-[#ff9999]",
  list: "bg-[#d6e8ff] border-[#99c2ff]",
}

const noteLabels = {
  rambling: "Reflections",
  "good-advice": "Actionable Advice ✓",
  "bad-advice": "Take with Caution",
  list: "Resources & Tools",
}

function getRotationForNote(id: string): number {
  // Simple hash function to generate a consistent number from the ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  // Map hash to a rotation between -15 and +15 degrees
  return (Math.abs(hash) % 30) - 15
}

export function StickyNote({
  note,
  onDelete,
  onPositionUpdate,
  onNoteUpdated,
  zoom = 1,
  viewMode = "canvas",
  sessionId,
}: {
  note: Note
  onDelete: (id: string) => void
  onPositionUpdate: (id: string, x: number, y: number) => void
  onNoteUpdated: (note: Note) => void
  zoom?: number
  viewMode?: "canvas" | "grid"
  sessionId?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: note.position_x, y: note.position_y })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [likes, setLikes] = useState(note.likes || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [copiedItemIndex, setCopiedItemIndex] = useState<number | null>(null)
  const noteRef = useRef<HTMLDivElement>(null)

  const baseRotation = getRotationForNote(note.id)

  const parseContent = () => {
    try {
      const parsed = JSON.parse(note.content)
      console.log("[v0] Parsed content:", parsed) // Debug log to check parsed content
      return parsed
    } catch {
      return { text: note.content }
    }
  }

  const contentData = parseContent()

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === "grid") return
    if ((e.target as HTMLElement).closest("button")) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX / zoom - position.x,
      y: e.clientY / zoom - position.y,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX / zoom - dragOffset.x
      const newY = e.clientY / zoom - dragOffset.y

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = async () => {
      if (!isDragging) return

      setIsDragging(false)

      // Update position in database
      const response = await fetch("/api/notes/update-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, x: position.x, y: position.y }),
      })

      if (response.ok) {
        onPositionUpdate(note.id, position.x, position.y)
      }
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, position, note.id, onPositionUpdate, zoom])

  useEffect(() => {
    if (!sessionId) return

    const checkLikeStatus = async () => {
      try {
        const response = await fetch("/api/notes/check-likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteIds: [note.id], sessionId }),
        })

        if (response.ok) {
          const data = await response.json()
          setIsLiked(!!data.likedNotes[note.id])
        }
      } catch (error) {
        console.error("Failed to check like status:", error)
      }
    }

    checkLikeStatus()
  }, [note.id, sessionId])

  const handleDelete = async () => {
    const response = await fetch("/api/notes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: note.id }),
    })

    if (response.ok) {
      onDelete(note.id)
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiking || !sessionId) return

    setIsLiking(true)
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1))

    try {
      const response = await fetch("/api/notes/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, sessionId }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikes(data.likes)
        setIsLiked(data.isLiked)
      } else {
        setIsLiked(wasLiked)
        setLikes((prev) => (wasLiked ? prev + 1 : prev - 1))
      }
    } catch (error) {
      setIsLiked(wasLiked)
      setLikes((prev) => (wasLiked ? prev + 1 : prev - 1))
    } finally {
      setIsLiking(false)
    }
  }

  const handleNoteUpdated = (updatedNote: Note) => {
    onNoteUpdated(updatedNote)
  }

  const handleCopyItem = async (item: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      await navigator.clipboard.writeText(item)
      setCopiedItemIndex(index)
      setTimeout(() => setCopiedItemIndex(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const showEditDelete = note.session_id === sessionId

  if (viewMode === "grid") {
    return (
      <>
        <div
          ref={noteRef}
          data-note-card
          className={`w-full p-4 pointer-events-auto ${noteColors[note.type]} border-2 shadow-lg transition-all hover:shadow-xl`}
          style={{
            transform: `rotate(${baseRotation * 0.3}deg)`,
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-bold text-[#6b5d4f] uppercase tracking-wide">{noteLabels[note.type]}</span>
            <div className="flex gap-1">
              {showEditDelete && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-blue-100"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100" onClick={handleDelete}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 handwritten text-[#3d3226] break-words">
            {note.type === "list" && contentData.title ? (
              <>
                <p className="font-bold text-xl break-words">{contentData.title}</p>
                <ul className="space-y-1 pl-4">
                  {contentData.items && Array.isArray(contentData.items) ? (
                    contentData.items.map((item: string, i: number) => (
                      <li key={i} className="text-base list-disc break-words relative group">
                        <span className="block transition-opacity group-hover:opacity-30">{item}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute inset-0 m-auto h-8 w-8 hover:bg-gray-100/90 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                          onClick={(e) => handleCopyItem(item, i, e)}
                          title="Copy item"
                        >
                          {copiedItemIndex === i ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </li>
                    ))
                  ) : (
                    <li className="text-base text-red-500">No items found</li>
                  )}
                </ul>
                {contentData.source && <p className="text-sm italic text-[#6b5d4f] mt-2">— {contentData.source}</p>}
              </>
            ) : (
              <>
                <p className="text-base leading-relaxed break-words">{contentData.text || note.content}</p>
                {contentData.source && (
                  <p className="text-sm italic text-[#6b5d4f] mt-2 break-words">— {contentData.source}</p>
                )}
              </>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-dashed border-[#6b5d4f]/30 flex items-center justify-between">
            <p className="text-sm text-[#6b5d4f]">{new Date(note.created_at).toLocaleDateString()}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-red-50 flex items-center gap-1"
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-red-400 text-red-400" : "text-[#6b5d4f]"}`} />
              <span className="text-sm font-medium text-[#6b5d4f]">{likes}</span>
            </Button>
          </div>
        </div>
        {showEditDelete && (
          <EditNoteDialog
            note={note}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onNoteUpdated={handleNoteUpdated}
          />
        )}
      </>
    )
  }

  // Canvas mode
  return (
    <>
      <div
        ref={noteRef}
        data-note-card
        className={`absolute w-64 p-4 pointer-events-auto ${noteColors[note.type]} border-2 shadow-lg cursor-move transition-shadow hover:shadow-xl ${
          isDragging ? "shadow-2xl scale-105" : ""
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: isDragging ? `rotate(${baseRotation + 3}deg) scale(1.05)` : `rotate(${baseRotation}deg)`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4 text-[#6b5d4f] opacity-50" />
            <span className="text-sm font-bold text-[#6b5d4f] uppercase tracking-wide">{noteLabels[note.type]}</span>
          </div>
          <div className="flex gap-1">
            {showEditDelete && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-blue-100"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100" onClick={handleDelete}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 handwritten text-[#3d3226] break-words">
          {note.type === "list" && contentData.title ? (
            <>
              <p className="font-bold text-xl break-words">{contentData.title}</p>
              <ul className="space-y-1 pl-4">
                {contentData.items && Array.isArray(contentData.items) ? (
                  contentData.items.map((item: string, i: number) => (
                    <li key={i} className="text-base list-disc break-words relative group">
                      <span className="block transition-opacity group-hover:opacity-30">{item}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 m-auto h-8 w-8 hover:bg-gray-100/90 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                        onClick={(e) => handleCopyItem(item, i, e)}
                        title="Copy item"
                      >
                        {copiedItemIndex === i ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className="text-base text-red-500">No items found</li>
                )}
              </ul>
              {contentData.source && <p className="text-sm italic text-[#6b5d4f] mt-2">— {contentData.source}</p>}
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed break-words">{contentData.text || note.content}</p>
              {contentData.source && (
                <p className="text-sm italic text-[#6b5d4f] mt-2 break-words">— {contentData.source}</p>
              )}
            </>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-dashed border-[#6b5d4f]/30 flex items-center justify-between">
          <p className="text-sm text-[#6b5d4f]">{new Date(note.created_at).toLocaleDateString()}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 hover:bg-red-50 flex items-center gap-1"
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-red-400 text-red-400" : "text-[#6b5d4f]"}`} />
            <span className="text-sm font-medium text-[#6b5d4f]">{likes}</span>
          </Button>
        </div>
      </div>
      {showEditDelete && (
        <EditNoteDialog
          note={note}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onNoteUpdated={handleNoteUpdated}
        />
      )}
    </>
  )
}
