"use client";

import * as React from "react";

type Position = { x: number; y: number };

type Props = {
  position?: Position;
  open?: boolean;
  onClose?: () => void;

  onCommand?: (cmd: "bold" | "italic" | "h1" | "h2" | "h3" | "ul" | "ol") => void;

  onBold?: () => void;
  onItalic?: () => void;
  onH1?: () => void;
  onH2?: () => void;
  onH3?: () => void;
  onUL?: () => void;
  onOL?: () => void;

  className?: string;
};

function callMaybe(fn?: () => void) {
  if (typeof fn === "function") fn();
}

function fire(props: Props, cmd: "bold" | "italic" | "h1" | "h2" | "h3" | "ul" | "ol") {
  if (props.onCommand) {
    props.onCommand(cmd);
    return;
  }
  switch (cmd) {
    case "bold":
      return callMaybe(props.onBold);
    case "italic":
      return callMaybe(props.onItalic);
    case "h1":
      return callMaybe(props.onH1);
    case "h2":
      return callMaybe(props.onH2);
    case "h3":
      return callMaybe(props.onH3);
    case "ul":
      return callMaybe(props.onUL);
    case "ol":
      return callMaybe(props.onOL);
  }
}

function Item(props: { label: React.ReactNode; cmd: Props["onCommand"] extends (...a: any) => any ? Parameters<NonNullable<Props["onCommand"]>>[0] : "bold"; onPick: (cmd: any) => void; }) {
  const { label, cmd, onPick } = props;
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPick(cmd);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(cmd);
    }
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      className="inline-flex items-center justify-center px-2 py-1 rounded border bg-white hover:bg-gray-50 cursor-pointer select-none"
      aria-label={typeof label === "string" ? label : String(cmd)}
      title={typeof label === "string" ? label : String(cmd)}
    >
      {label}
    </span>
  );
}

/**
 * Лёгкое меню форматирования текста.
 * Без <button> внутри, чтобы не провоцировать nested button и гидрацию.
 */
export default function TextFormatMenu(props: Props) {
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const root = menuRef.current;
      if (!root) return;
      const el = e.target as Node;
      if (!root.contains(el)) {
        props.onClose?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [props.onClose]);

  const visible = props.open !== false;
  if (!visible) return null;

  const pos = props.position ?? { x: 0, y: 0 };
  const pick = (cmd: Parameters<NonNullable<Props["onCommand"]>>[0]) => fire(props, cmd);

  return (
    <div
      ref={menuRef}
      className={
        "fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1 " +
        (props.className || "")
      }
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Item label={<b>B</b>} cmd="bold" onPick={pick} />
      <Item label={<i>I</i>} cmd="italic" onPick={pick} />
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <Item label={"H1"} cmd="h1" onPick={pick} />
      <Item label={"H2"} cmd="h2" onPick={pick} />
      <Item label={"H3"} cmd="h3" onPick={pick} />
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <Item label={"•"} cmd="ul" onPick={pick} />
      <Item label={"1."} cmd="ol" onPick={pick} />
    </div>
  );
}