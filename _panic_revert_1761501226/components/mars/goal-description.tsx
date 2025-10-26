"use client";

import React, { useRef, useState } from "react";
import TextFormatMenu, { TextFormatMenu as NamedTextFormatMenu, type MdCmd } from "@/components/ui/text-format-menu";

type GoalDescriptionProps = {
  /** Текущее значение описания */
  data: string;
  /** Установка значения извне */
  setData: (v: string) => void;
  placeholder?: string;
};

/** Унифицированный компонент. Экспортируется и как named, и как default. */
export function GoalDescription({ data, setData, placeholder }: GoalDescriptionProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [menu, setMenu] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ show: true, x: e.clientX, y: e.clientY });
    taRef.current?.focus();
  };

  const onCloseMenu = () => setMenu((m) => ({ ...m, show: false }));

  const applyInlineWrap = (before: string, after = before) => {
    const ta = taRef.current;
    if (!ta) return;
    const src = ta.value;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;
    if (s === e) return;

    const hasLeft = s - before.length >= 0 && src.slice(s - before.length, s) === before;
    const hasRight = src.slice(e, e + after.length) === after;

    if (hasLeft && hasRight) {
      const next = src.slice(0, s - before.length) + src.slice(s, e) + src.slice(e + after.length);
      setData(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(s - before.length, e - before.length);
      });
    } else {
      const next = src.slice(0, s) + before + src.slice(s, e) + after + src.slice(e);
      setData(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(s + before.length, e + before.length);
      });
    }
  };

  const applyPrefix = (p: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const src = ta.value;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;

    const lineStart = (i: number) => src.lastIndexOf("\n", i - 1) + 1;
    const lineEnd = (i: number) => { const j = src.indexOf("\n", i); return j === -1 ? src.length : j; };

    const L = lineStart(s), R = lineEnd(e);
    const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R);

    const lines = middle.split("\n");
    const allPrefixed = lines.every(l => l.startsWith(p));
    const newLines = allPrefixed
      ? lines.map(l => (l.startsWith(p) ? l.slice(p.length) : l))
      : lines.map(l => (l.trim().length === 0 ? l : (l.startsWith(p) ? l : p + l)));

    const newMiddle = newLines.join("\n");
    const next = before + newMiddle + after;
    setData(next);

    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s, s + newMiddle.length);
    });
  };

  const onCommand = (cmd: MdCmd) => {
    switch (cmd) {
      case "bold":   return applyInlineWrap("**");
      case "italic": return applyInlineWrap("*");
      case "h1":     return applyPrefix("# ");
      case "h2":     return applyPrefix("## ");
      case "h3":     return applyPrefix("### ");
      case "ul":     return applyPrefix("- ");
      case "ol":     return applyPrefix("1. ");
    }
  };

  const Menu = NamedTextFormatMenu ?? TextFormatMenu;

  return (
    <div className="relative space-y-2">
      <div className="text-sm font-medium text-gray-700">Goal description</div>
      <textarea
        ref={taRef}
        className="w-full min-h-[160px] resize-y border rounded p-2"
        value={data}
        onChange={(e) => setData(e.target.value)}
        onContextMenu={onContextMenu}
        placeholder={placeholder || "Write one-pager description in **Markdown**"}
        spellCheck={false}
      />
      {menu.show && (
        <Menu
          open={menu.show}
          position={{ x: menu.x, y: menu.y }}
          onClose={onCloseMenu}
          onCommand={onCommand}
        />
      )}
    </div>
  );
}

// даём и default экспорт (на случай default-импорта где-то в коде)
export default GoalDescription;
