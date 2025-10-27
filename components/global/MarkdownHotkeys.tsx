"use client";
import { useEffect } from "react";
import { applyCommandToTextarea, type MdCmd } from "@/components/lib/markdown-ops";

function isInContentArea(el: Element | null): boolean {
  if (!el) return false;
  let node: Element | null = el;
  while (node) {
    if ((node as HTMLElement).dataset?.contentArea !== undefined) return true;
    node = node.parentElement;
  }
  return false;
}

export default function MarkdownHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (!(active instanceof HTMLTextAreaElement)) return;
      if (!isInContentArea(active)) return;

      const mod = e.metaKey || e.ctrlKey;

      // Tab / Shift+Tab — управление отступом списков
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd: MdCmd = e.shiftKey ? "shiftTab" : "tab";
        applyCommandToTextarea(active, cmd);
        return;
      }

      if (!mod) return;

      // Bold
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        applyCommandToTextarea(active, "bold");
        return;
      }
      // Italic
      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        applyCommandToTextarea(active, "italic");
        return;
      }
      // Заголовки H1/H2/H3: Cmd/Ctrl+1/2/3
      if (["1","2","3"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, MdCmd> = { "1": "h1", "2": "h2", "3": "h3" };
        applyCommandToTextarea(active, map[e.key]);
        return;
      }
      // Списки: Cmd/Ctrl+8 — маркированный, Cmd/Ctrl+7 — нумерованный
      if (e.key === "8") {
        e.preventDefault();
        applyCommandToTextarea(active, "ul");
        return;
      }
      if (e.key === "7") {
        e.preventDefault();
        applyCommandToTextarea(active, "ol");
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}