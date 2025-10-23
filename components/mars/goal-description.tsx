"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { TextFormatMenu } from "@/components/ui/text-format-menu"
import type { OnePagerData } from "@/types/onepager"

interface GoalDescriptionProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

export function GoalDescription({ data, setData }: GoalDescriptionProps) {
  const [formatMenu, setFormatMenu] = useState<{
    show: boolean
    x: number
    y: number
    field: "goal" | "description" | null
  }>({
    show: false,
    x: 0,
    y: 0,
    field: null,
  })

  const handleContextMenu = (e: React.MouseEvent, field: "goal" | "description") => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      e.preventDefault()
      setFormatMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        field,
      })
    }
  }

  const handleFormat = (format: "bold" | "italic" | "underline" | "link" | "code") => {
    const selection = window.getSelection()
    if (!selection || !formatMenu.field) return

    const selectedText = selection.toString()
    let formattedText = ""

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`
        break
      case "italic":
        formattedText = `*${selectedText}*`
        break
      case "underline":
        formattedText = `__${selectedText}__`
        break
      case "link":
        const url = prompt("Enter URL:")
        if (url) formattedText = `[${selectedText}](${url})`
        else return
        break
      case "code":
        formattedText = `\`${selectedText}\``
        break
    }

    const field = formatMenu.field
    const currentValue = data[field]
    const range = selection.getRangeAt(0)
    const startOffset = range.startOffset
    const endOffset = range.endOffset

    const newValue = currentValue.substring(0, startOffset) + formattedText + currentValue.substring(endOffset)

    setData({ ...data, [field]: newValue })
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 animate-slide-up">
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-3">Goal</h3>
        <Textarea
          value={data.goal}
          onChange={(e) => setData({ ...data, goal: e.target.value })}
          onContextMenu={(e) => handleContextMenu(e, "goal")}
          placeholder="Project goal and objectives..."
          className="min-h-[100px] resize-none"
        />
      </Card>

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-[var(--mars-blue-primary)] mb-3">Description</h3>
        <Textarea
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          onContextMenu={(e) => handleContextMenu(e, "description")}
          placeholder="Detailed project description and context..."
          className="min-h-[100px] resize-none"
        />
      </Card>

      {formatMenu.show && (
        <TextFormatMenu
          position={{ x: formatMenu.x, y: formatMenu.y }}
          onFormat={handleFormat}
          onClose={() => setFormatMenu({ show: false, x: 0, y: 0, field: null })}
        />
      )}
    </div>
  )
}
