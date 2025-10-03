"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { StickyNote } from "./sticky-note"
import { AddNoteDialog } from "./add-note-dialog"
import { Plus, Filter, Search, LayoutGrid, Sparkles, ChevronDown, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
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
  const [showFilters, setShowFilters] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const currentPanRef = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()
  const touchStartDistanceRef = useRef<number>(0)
  const touchStartZoomRef = useRef<number>(1)

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
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        currentPanRef.current = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        }
        rafRef.current = requestAnimationFrame(updateTransform)
      }
    },
    [isPanning, updateTransform],
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
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
    if (typeFilter !== "all" && note.type !== typeFilter) return false

    let contentData
    try {
      contentData = JSON.parse(note.content)
    } catch {
      contentData = { text: note.content }
    }

    if (givenByFilter !== "all") {
      const source = contentData.source || ""
      if (!source.toLowerCase().includes(givenByFilter.toLowerCase())) return false
    }

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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const target = e.target as HTMLElement
      const isNote = target.closest("[data-note-card]")

      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
        touchStartDistanceRef.current = distance
        touchStartZoomRef.current = zoom
        e.preventDefault()
      } else if (e.touches.length === 1 && !isNote) {
        setIsPanning(true)
        const touch = e.touches[0]
        panStartRef.current = {
          x: touch.clientX - currentPanRef.current.x,
          y: touch.clientY - currentPanRef.current.y,
        }
      }
    },
    [zoom],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
        const scale = distance / touchStartDistanceRef.current
        const newZoom = Math.min(Math.max(0.1, touchStartZoomRef.current * scale), 3)
        setZoom(newZoom)
        e.preventDefault()
      } else if (e.touches.length === 1 && isPanning) {
        const touch = e.touches[0]
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        currentPanRef.current = {
          x: touch.clientX - panStartRef.current.x,
          y: touch.clientY - panStartRef.current.y,
        }
        rafRef.current = requestAnimationFrame(updateTransform)
        e.preventDefault()
      }
    },
    [isPanning, updateTransform],
  )

  const handleTouchEnd = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      setPan(currentPanRef.current)
    }
    touchStartDistanceRef.current = 0
  }, [isPanning])

  return (
    <div className="relative w-full min-h-screen dot-grid">
      <div className="sticky top-0 z-10 bg-[#faf8f3]/95 backdrop-blur-sm border-b-2 border-dashed border-[#d4c5b0] py-3 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#3d3226] handwritten">Coffee Notes</h1>
              <div className="md:hidden">
                <Button
                  onClick={() => setShowDescription(!showDescription)}
                  variant="ghost"
                  className="p-0 h-auto text-xs text-[#6b5d4f] hover:text-[#3d3226] hover:bg-transparent handwritten mt-1"
                >
                  {showDescription ? "Hide" : "About"}
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showDescription ? "rotate-180" : ""}`} />
                </Button>
                {showDescription && (
                  <p className="text-xs text-[#6b5d4f] mt-2 leading-relaxed">
                    Coffee Notes is a collective archive of advice gathered from our coffee chats with mentors,
                    recruiters, and peers. As junior designers, we often wonder how to give back — and this is our way:
                    sharing the notes that helped us take the next step. Together, we can make the ladder a little
                    easier to climb.
                  </p>
                )}
              </div>
              <p className="hidden md:block text-xs md:text-sm lg:text-base text-[#6b5d4f] mt-1 max-w-3xl leading-relaxed">
                Coffee Notes is a collective archive of advice gathered from our coffee chats with mentors, recruiters,
                and peers. As junior designers, we often wonder how to give back — and this is our way: sharing the
                notes that helped us take the next step. Together, we can make the ladder a little easier to climb.
              </p>
            </div>
            <div className="hidden md:flex gap-2 flex-shrink-0">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#f4e4c1] hover:bg-[#e8d4a8] text-[#3d3226] border-2 border-[#3d3226] shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] hover:shadow-[5px_5px_0px_0px_rgba(61,50,38,1)] transition-all handwritten text-base md:text-lg h-auto py-2 px-4"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Note
              </Button>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="w-full bg-[#f4e4c1] hover:bg-[#e8d4a8] text-[#3d3226] border-2 border-[#3d3226] shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] hover:shadow-[5px_5px_0px_0px_rgba(61,50,38,1)] transition-all handwritten text-lg h-auto py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Note
            </Button>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant={viewMode === "canvas" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={`h-9 px-3 handwritten flex-1 ${
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
                className={`h-9 px-3 handwritten flex-1 ${
                  viewMode === "grid"
                    ? "bg-[#3d3226] text-white hover:bg-[#3d3226]/90"
                    : "bg-white text-[#3d3226] border-2 border-[#d4c5b0] hover:bg-[#f4e4c1]"
                }`}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Grid
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className={`h-9 px-3 ${
                  showFilters
                    ? "bg-[#3d3226] text-white hover:bg-[#3d3226]/90"
                    : "bg-white text-[#3d3226] border-2 border-[#d4c5b0] hover:bg-[#f4e4c1]"
                } handwritten relative`}
              >
                <Filter className="w-4 h-4" />
                {(typeFilter !== "all" || givenByFilter !== "all" || searchQuery) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#3d3226] rounded-full" />
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="space-y-3 p-3 bg-white border-2 border-[#d4c5b0] rounded-lg">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full h-10 text-sm bg-white border-2 border-[#d4c5b0] handwritten">
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
                  <SelectTrigger className="w-full h-10 text-sm bg-white border-2 border-[#d4c5b0] handwritten">
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

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5d4f]" />
                  <Input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-sm bg-white border-2 border-[#d4c5b0] handwritten placeholder:text-[#6b5d4f]/50"
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
                    className="w-full text-sm text-[#6b5d4f] hover:text-[#3d3226] handwritten"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-3 pb-2">
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

      <div
        ref={canvasRef}
        className={`relative w-full ${viewMode === "canvas" ? "h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]" : "min-h-[calc(100vh-200px)] md:min-h-[calc(100vh-180px)]"} overflow-hidden canvas-background ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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

        {viewMode === "canvas" && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
            <Button
              onClick={handleZoomIn}
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleZoomOut}
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleResetView}
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-[#f4e4c1] text-[#3d3226] border-2 border-[#3d3226] shadow-[2px_2px_0px_0px_rgba(61,50,38,1)] hover:shadow-[3px_3px_0px_0px_rgba(61,50,38,1)] transition-all"
              title="Actual Size"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <AddNoteDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onNoteAdded={handleNoteAdded}
        sessionId={sessionId}
      />

      <footer className="hidden md:block fixed bottom-4 left-4 z-20">
        <p className="text-sm text-[#6b5d4f] handwritten">
          Vibe-Coded by{" "}
          <a
            href="https://www.harshapillai.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3d3226] hover:text-[#6b5d4f] underline decoration-2 underline-offset-2 transition-colors"
          >
            This Human
          </a>
        </p>
      </footer>
    </div>
  )
}
