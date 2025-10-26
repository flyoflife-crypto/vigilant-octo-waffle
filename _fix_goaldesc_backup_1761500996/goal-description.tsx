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

export function GoalDescription
  const taRef = React.useRef<HTMLTextAreaElement|null>(null);({ data, setData }: GoalDescriptionProps) {
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

  
// === inline markdown ops (по selectionStart/End) ===
function __md_commit(ta: HTMLTextAreaElement, text: string, ns: number, ne: number) {
  ta.value = text; ta.focus(); try { ta.setSelectionRange(ns, ne); } catch {}
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function __md_wrap(ta: HTMLTextAreaElement, before: string, after = before) {
  const src = ta.value; let s = ta.selectionStart ?? 0; let e = ta.selectionEnd ?? 0;
  if (s === e) return;
  const hasLeft  = s - before.length >= 0 && src.slice(s - before.length, s) === before;
  const hasRight = src.slice(e, e + after.length) === after;
  if (hasLeft && hasRight) {
    const next = src.slice(0, s - before.length) + src.slice(s, e) + src.slice(e + after.length);
    const ns = s - before.length; const ne = ns + (e - s);
    __md_commit(ta, next, ns, ne);
  } else {
    const next = src.slice(0, s) + before + src.slice(s, e) + after + src.slice(e);
    const ns = s + before.length; const ne = ns + (e - s);
    __md_commit(ta, next, ns, ne);
  }
}
function __md_prefix(ta: HTMLTextAreaElement, p: string) {
  const src = ta.value; let s = ta.selectionStart ?? 0; let e = ta.selectionEnd ?? 0;
  const lineStart = (i:number)=> src.lastIndexOf('\n', i-1) + 1;
  const lineEnd   = (i:number)=> { const j = src.indexOf('\n', i); return j === -1 ? src.length : j; };
  const L = lineStart(s), R = lineEnd(e);
  const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R);
  const lines = middle.split('\n');
  const allPref = lines.every(l=>l.startsWith(p));
  const newLines = allPref ? lines.map(l=>l.startsWith(p)? l.slice(p.length):l)
                           : lines.map(l=> l.trim().length===0 ? l : (l.startsWith(p)? l : p+l));
  const newMiddle = newLines.join('\n'); const delta = newMiddle.length - middle.length;
  const next = before + newMiddle + after;
  __md_commit(ta, next, s, e + delta);
}
// единый обработчик команд
function __md_apply(cmd: 'bold'|'italic'|'h1'|'h2'|'h3'|'ul'|'ol') {
  const ta = taRef.current; if (!ta) return;
  if (cmd==='bold')   return __md_wrap(ta,'**');
  if (cmd==='italic') return __md_wrap(ta,'*');
  if (cmd==='h1')     return __md_prefix(ta,'# ');
  if (cmd==='h2')     return __md_prefix(ta,'## ');
  if (cmd==='h3')     return __md_prefix(ta,'### ');
  if (cmd==='ul')     return __md_prefix(ta,'- ');
  if (cmd==='ol')     return __md_prefix(ta,'1. ');
}
// ================================================
return (
    <div className="grid md:grid-cols-2 gap-5 animate-slide-up">
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    (setMenuOpen? setMenuOpen(true) : null);
    (setMenuPos? setMenuPos({ x: e.clientX, y: e.clientY }) : null);
    taRef.current?.focus();
  };
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
          onClose={() = onCommand={__md_apply}> setFormatMenu({ show: false, x: 0, y: 0, field: null })}
        />
      )}
    </div>
  )
}
