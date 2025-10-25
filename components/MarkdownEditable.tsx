import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
};

export default function MarkdownEditable({
  value,
  onChange,
  className,
  placeholder,
}: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Гарантируем фокус на textarea перед работой с выделением
  const ensureFocus = () => {
    const ta = taRef.current;
    if (!ta) return null;
    ta.focus();
    return ta;
  };

  // Оборачиваем выделение в **...** / *...*
  const wrap = (before: string, after = before) => {
    const ta = ensureFocus();
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = value.slice(start, end) || "text";
    const nextVal =
      value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(nextVal);
    // Вернуть выделение поверх вставленного текста
    requestAnimationFrame(() => {
      const s = start + before.length;
      const e = s + sel.length;
      ta.setSelectionRange(s, e);
    });
  };

  // Префиксуем строки (заголовки / списки)
  const prefixLines = (prefix: string) => {
    const ta = ensureFocus();
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    let pos = 0;
    const out = value
      .split("\n")
      .map((line) => {
        const s = pos,
          e = pos + line.length;
        pos += line.length + 1;
        if (e < start || s > end) return line;
        return line.startsWith(prefix) ? line : `${prefix}${line}`;
      })
      .join("\n");
    onChange(out);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // не отдаём фокус кнопке
          onClick={() => wrap("**")}
          title="Bold"
          aria-label="Bold"
        >
          <b>B</b>
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap("*")}
          title="Italic"
          aria-label="Italic"
        >
          <i>I</i>
        </button>

        <span className="mx-2">|</span>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => prefixLines("# ")}
          title="H1"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => prefixLines("## ")}
          title="H2"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => prefixLines("### ")}
          title="H3"
        >
          H3
        </button>

        <span className="mx-2">|</span>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => prefixLines("- ")}
          title="Bulleted"
        >
          •
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => prefixLines("1. ")}
          title="Numbered"
        >
          1.
        </button>

        <span className="mx-2">|</span>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
        >
          {mode === "edit" ? "Preview" : "Edit"}
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          ref={taRef}
          className="w-full min-h-[160px] resize-y border rounded p-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="prose max-w-none border rounded p-3 bg-white">
          {value?.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <div className="opacity-60">
              {placeholder || "Nothing to preview"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
