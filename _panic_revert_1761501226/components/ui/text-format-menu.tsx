"use client";

import React, { useEffect, useRef } from "react";

export type MdCmd = "bold" | "italic" | "h1" | "h2" | "h3" | "ul" | "ol";

export type TextFormatMenuProps = {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCommand: (cmd: MdCmd) => void;
};

export function TextFormatMenu({ open, position, onClose, onCommand }: TextFormatMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const Btn = ({ cmd, label }: { cmd: MdCmd; label: string }) => (
    <button
      onClick={() => onCommand(cmd)}
      className="px-2 py-1 text-sm rounded hover:bg-gray-100"
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1"
      style={{ left: position.x, top: position.y }}
    >
      <Btn cmd="bold" label="**B**" />
      <Btn cmd="italic" label="*i*" />
      <Btn cmd="h1" label="H1" />
      <Btn cmd="h2" label="H2" />
      <Btn cmd="h3" label="H3" />
      <Btn cmd="ul" label="• list" />
      <Btn cmd="ol" label="1. list" />
    </div>
  );
}

// даём и default, и named экспорт — чтобы не упасть на разных импортах
export default TextFormatMenu;
