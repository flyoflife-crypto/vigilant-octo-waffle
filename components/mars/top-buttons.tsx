"use client"

import { Button } from "@/components/ui/button"
import { Download, Upload, FileText, FileCode, Undo, Redo } from "lucide-react"
import { InfoDialog } from "@/components/ui/info-dialog"

interface TopButtonsProps {
  onExportJSON: () => void
  onImportJSON: () => void
  onExportPDF: () => void
  onExportPNG: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function TopButtons({
  onExportJSON,
  onImportJSON,
  onExportPDF,
  onExportPNG,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TopButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3 justify-end print:hidden animate-fade-in">
      <InfoDialog />

      {onUndo && (
        <Button
          onClick={onUndo}
          variant="outline"
          size="sm"
          disabled={!canUndo}
          className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent disabled:opacity-50 text-xs md:text-sm"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Undo</span>
        </Button>
      )}
      {onRedo && (
        <Button
          onClick={onRedo}
          variant="outline"
          size="sm"
          disabled={!canRedo}
          className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent disabled:opacity-50 text-xs md:text-sm"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Redo</span>
        </Button>
      )}

      <Button
        onClick={onImportJSON}
        variant="outline"
        size="sm"
        className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent text-xs md:text-sm"
      >
        <Upload className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden sm:inline">Import</span>
      </Button>
      <Button
        onClick={onExportJSON}
        variant="outline"
        size="sm"
        className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent text-xs md:text-sm"
      >
        <Download className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden sm:inline">JSON</span>
      </Button>
      <Button
        onClick={onExportPNG}
        variant="outline"
        size="sm"
        className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent text-xs md:text-sm"
      >
        <FileCode className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden sm:inline">PNG</span>
      </Button>
      <Button
        onClick={onExportPDF}
        size="sm"
        className="gap-1 md:gap-2 bg-[var(--mars-blue-primary)] hover:bg-[var(--mars-blue-light)] transition-colors text-xs md:text-sm"
      >
        <FileText className="w-3 h-3 md:w-4 md:h-4" />
        <span className="hidden sm:inline">PDF</span>
      </Button>
    </div>
  )
}
