export type MdCmd = "bold" | "italic" | "h1" | "h2" | "h3" | "ul" | "ol" | "tab" | "shiftTab";

export function applyCommandToTextarea(
  ta: HTMLTextAreaElement,
  cmd: MdCmd
): void {
  const src = ta.value;
  let s = ta.selectionStart ?? 0;
  let e = ta.selectionEnd ?? 0;
  if (s === e && (cmd === "bold" || cmd === "italic")) {
    // нет выделения — для inline команд ничего не делаем
    return;
  }

  const commit = (text: string, ns: number, ne: number) => {
    ta.value = text;
    ta.focus();
    ta.setSelectionRange(ns, ne);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const wrap = (before: string, after = before) => {
    const hasLeft  = s - before.length >= 0 && src.slice(s - before.length, s) === before;
    const hasRight = src.slice(e, e + after.length) === after;
    if (hasLeft && hasRight) {
      // снять обёртку (toggle)
      const next = src.slice(0, s - before.length) + src.slice(s, e) + src.slice(e + after.length);
      const ns = s - before.length;
      const ne = ns + (e - s);
      commit(next, ns, ne);
    } else {
      const next = src.slice(0, s) + before + src.slice(s, e) + after + src.slice(e);
      const ns = s + before.length;
      const ne = ns + (e - s);
      commit(next, ns, ne);
    }
  };

  const prefix = (p: string) => {
    const lineStart = (i: number) => src.lastIndexOf("\n", i - 1) + 1;
    const lineEnd = (i: number) => { const j = src.indexOf("\n", i); return j === -1 ? src.length : j };
    const L = lineStart(s), R = lineEnd(e);
    const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R);
    const lines = middle.split("\n");
    const allPrefixed = lines.every(l => l.startsWith(p));
    const newLines = allPrefixed
      ? lines.map(l => (l.startsWith(p) ? l.slice(p.length) : l))
      : lines.map(l => (l.trim().length === 0 ? l : (l.startsWith(p) ? l : p + l)));
    const newMiddle = newLines.join("\n");
    const delta = newMiddle.length - middle.length;
    const next = before + newMiddle + after;
    commit(next, s, e + delta);
  };

  // Хелперы для Tab/Shift+Tab на списках
  const isListLine = (line: string) => /^(\s*)([-*+] |\d+\. )/.test(line);
  const indentLine = (line: string) => "  " + line; // +2 пробела
  const outdentLine = (line: string) => line.replace(/^ {1,2}/, "");

  switch (cmd) {
    case "bold":   return wrap("**");
    case "italic": return wrap("*");
    case "h1":     return prefix("# ");
    case "h2":     return prefix("## ");
    case "h3":     return prefix("### ");
    case "ul":     return prefix("- ");
    case "ol":     return prefix("1. ");
    case "tab": {
      const lineStart = (i: number) => src.lastIndexOf("\n", i - 1) + 1;
      const lineEnd = (i: number) => { const j = src.indexOf("\n", i); return j === -1 ? src.length : j };
      const L = lineStart(s), R = lineEnd(e);
      const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R);
      const lines = middle.split("\n");
      const newLines = lines.map(l => (isListLine(l) ? indentLine(l) : l));
      if (newLines.join("\n") !== middle) {
        const newMiddle = newLines.join("\n");
        const delta = newMiddle.length - middle.length;
        const next = before + newMiddle + after;
        commit(next, s + 2, e + delta); // сохраняем выделение, двигаем на 2
      } else {
        // не список — вставляем 2 пробела
        const next = src.slice(0, s) + "  " + src.slice(s);
        commit(next, s + 2, e + 2);
      }
      return;
    }
    case "shiftTab": {
      const lineStart = (i: number) => src.lastIndexOf("\n", i - 1) + 1;
      const lineEnd = (i: number) => { const j = src.indexOf("\n", i); return j === -1 ? src.length : j };
      const L = lineStart(s), R = lineEnd(e);
      const before = src.slice(0, L), middle = src.slice(L, R), after = src.slice(R);
      const lines = middle.split("\n");
      const newLines = lines.map(l => (isListLine(l) ? outdentLine(l) : l));
      const newMiddle = newLines.join("\n");
      const delta = newMiddle.length - middle.length;
      const next = before + newMiddle + after;
      commit(next, s - Math.min(2, s - L), e + delta);
      return;
    }
  }
}
