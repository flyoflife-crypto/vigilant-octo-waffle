"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Underline, Link, Code } from "lucide-react"

interface TextFormatMenuProps {
  onFormat: (format: "bold" | "italic" | "underline" | "link" | "code") => void
  position: { x: number; y: number }
  onClose: () => void
}

export function TextFormatMenu({ onFormat, position, onClose }: TextFormatMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1"
      style={{ left: position.x, top: position.y }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onFormat("bold")
          onClose()
        }}
        className="h-8 w-8 p-0"
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onFormat("italic")
          onClose()
        }}
        className="h-8 w-8 p-0"
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onFormat("underline")
          onClose()
        }}
        className="h-8 w-8 p-0"
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onFormat("link")
          onClose()
        }}
        className="h-8 w-8 p-0"
        title="Add Link"
      >
        <Link className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onFormat("code")
          onClose()
        }}
        className="h-8 w-8 p-0"
        title="Code"
      >
        <Code className="w-4 h-4" />
      </Button>
    </div>
  )
}
