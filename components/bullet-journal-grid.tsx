"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { StickyNote } from "./sticky-note"
import { AddNoteDialog } from "./add-note-dialog"
import { Plus, Filter, Search, ZoomIn, ZoomOut, Maximize2, LayoutGrid, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

type Note = {
  id: string
  type: "rambling" | "good-advice" | "bad-advice" | "list"
  content: string
  source?: string
  items?: string[]
  position_x: number
  position_y: number
  created_at: string
  likes?: number
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""

  let sessionId = localStorage.getItem("coffee-notes-session-id")
  if (!sessionId) {
    sessionId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem("coffee-notes-session-id", sessionId)
  }
  return sessionId
}

export function BulletJournalGrid({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [givenByFilter, setGivenByFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas")
  const [sessionId, setSessionId] = useState<string>("")

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const currentPanRef = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  const handleNoteAdded = (newNote: Note) => {
    setNotes([newNote, ...notes])
  }

  const handleNoteDeleted = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id))
  }

  const handleNoteUpdated = (updatedNote: Note) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
  }

  const handlePositionUpdate = (id: string, x: number, y: number) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, position_x: x, position_y: y } : note)))
  }

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      setZoom((prev) => Math.min(Math.max(0.1, prev + delta), 3))
    }
  }, [])

  const updateTransform = useCallback(() => {
    if (contentRef.current) {
      const { x, y } = currentPanRef.current
      contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`
    }
  }, [zoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isNote = target.closest("[data-note-card]")

    if (!isNote) {
      setIsPanning(true)
      panStartRef.current = {
        x: e.clientX - currentPanRef.current.x,
        y: e.clientY - currentPanRef.current.y,
      }
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        // Cancel any pending animation frame
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }

        // Update the current pan position
        currentPanRef.current = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        }

        // Use requestAnimationFrame for smooth updates
        rafRef.current = requestAnimationFrame(updateTransform)
      }
    },
    [isPanning, updateTransform],
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      // Sync the ref value to state when panning stops
      setPan(currentPanRef.current)
    }
  }, [isPanning])

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.1))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    currentPanRef.current = { x: 0, y: 0 }
  }

  useEffect(() => {
    currentPanRef.current = pan
    updateTransform()
  }, [pan, updateTransform])

  useEffect(() => {
    updateTransform()
  }, [zoom, updateTransform])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false })
      return () => canvas.removeEventListener("wheel", handleWheel)
    }
  }, [handleWheel])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const filteredNotes = notes.filter((note) => {
    // Type filter
    if (typeFilter !== "all" && note.type !== typeFilter) return false

    let contentData
    try {
      contentData = JSON.parse(note.content)
    } catch {
      contentData = { text: note.content }
    }

    // Given by filter
    if (givenByFilter !== "all") {
      const source = contentData.source || ""
      if (!source.toLowerCase().includes(givenByFilter.toLowerCase())) return false
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const text = contentData.text || note.content || ""
      const title = contentData.title || ""
      const items = contentData.items?.join(" ") || ""
      const source = contentData.source || ""

      const searchableContent = `${text} ${title} ${items} ${source}`.toLowerCase()
      if (!searchableContent.includes(query)) return false
    }

    return true
  })

  return (
    <div className="relative w-full min-h-screen dot-grid">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f3]/95 backdrop-blur-sm border-b-2 border-dashed border-[#d4c5b0] py-3 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-[#3d3226] handwritten">Coffee Notes</h1>
              <p className="text-sm md:text-base text-[#6b5d4f] mt-1 max-w-3xl leading-relaxed">
                Coffee Notes is a collective archive of advice gathered from our coffee chats with mentors, recruiters,
                and peers. As junior designers, we often wonder how to give back — and this is our way: sharing the
                notes that helped us take the next step. Together, we can make the ladder a little easier to climb.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#f4e4c1] hover:bg-[#e8d4a8] text-[#3d3226] border-2 border-[#3d3226] shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] hover:shadow-[5px_5px_0px_0px_rgba(61,50,38,1)] transition-all handwritten text-base md:text-lg h-auto py-2 px-4"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Note
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-2">
            <div className="flex items-center gap-2 mr-4">
              <Button
                variant={viewMode === "canvas" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={`h-9 px-3 handwritten ${
                  viewMode === "canvas"
                    ? "bg-[#3d3226] text-white hover:bg-[#3d3226]/90"
                    : "bg-white text-[#3d3226] border-2 border-[#d4c5b0] hover:bg-[#f4e4c1]"
                }`}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Canvas
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-9 px-3 handwritten ${
                  viewMode === "grid"
                    ? "bg-[#3d3226] text-white hover:bg-[#3d3226]/90"
                    : "bg-white text-[#3d3226] border-2 border-[#d4c5b0] hover:bg-[#f4e4c1]"
                }`}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Grid
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[#6b5d4f]">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm bg-white border-2 border-[#d4c5b0] handwritten">
                <SelectValue placeholder="Note Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rambling">Reflections</SelectItem>
                <SelectItem value="good-advice">Actionable Advice</SelectItem>
                <SelectItem value="list">Resources & Tools</SelectItem>
                <SelectItem value="bad-advice">Take with Caution</SelectItem>
              </SelectContent>
            </Select>

            <Select value={givenByFilter} onValueChange={setGivenByFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm bg-white border-2 border-[#d4c5b0] handwritten">
                <SelectValue placeholder="Given By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="senior designer">Senior Designer</SelectItem>
                <SelectItem value="mid-level designer">Mid-Level Designer</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="myself">Myself</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5d4f]" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-white border-2 border-[#d4c5b0] handwritten placeholder:text-[#6b5d4f]/50"
              />
            </div>

            {(typeFilter !== "all" || givenByFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("all")
                  setGivenByFilter("all")
                  setSearchQuery("")
                }}
                className="text-sm text-[#6b5d4f] hover:text-[#3d3226] handwritten"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-2">
        <Button
          onClick={handleZoomIn}
          size="icon"
          className="bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
          title="Zoom In (Ctrl + Scroll)"
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleZoomOut}
          size="icon"
          className="bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
          title="Zoom Out (Ctrl + Scroll)"
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleResetView}
          size="icon"
          className="bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
          title="Reset View"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
        <div className="bg-white border-2 border-[#3d3226] px-3 py-1 text-sm handwritten text-[#3d3226] text-center">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div
        ref={canvasRef}
        className={`relative w-full ${viewMode === "canvas" ? "h-[calc(100vh-180px)]" : "min-h-[calc(100vh-180px)]"} overflow-hidden canvas-background ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            width: viewMode === "canvas" ? "200%" : "100%",
            height: viewMode === "canvas" ? "200%" : "auto",
            minHeight: "100%",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
          {filteredNotes.length === 0 ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <p className="text-lg text-[#6b5d4f] handwritten">
                {searchQuery || typeFilter !== "all" || givenByFilter !== "all"
                  ? "No notes match your filters"
                  : "No notes yet. Add your first note!"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 pointer-events-auto">
              {filteredNotes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onDelete={handleNoteDeleted}
                  onPositionUpdate={handlePositionUpdate}
                  onNoteUpdated={handleNoteUpdated}
                  zoom={zoom}
                  viewMode="grid"
                  sessionId={sessionId}
                />
              ))}
            </div>
          ) : (
            // Canvas layout with absolute positioning
            filteredNotes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                onDelete={handleNoteDeleted}
                onPositionUpdate={handlePositionUpdate}
                onNoteUpdated={handleNoteUpdated}
                zoom={zoom}
                viewMode="canvas"
                sessionId={sessionId}
              />
            ))
          )}
        </div>
      </div>

      <AddNoteDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onNoteAdded={handleNoteAdded}
        sessionId={sessionId}
      />
    </div>
  )
}
