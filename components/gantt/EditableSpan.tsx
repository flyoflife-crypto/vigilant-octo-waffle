'use client';

import React from 'react';

export default function EditableSpan({
  value,
  onCommit,
  className,
}: {
  value: any;
  onCommit: (t: string) => void;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };
  const safe = (value ?? '').toString();

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onKeyDown={onKeyDown}
      onBlur={(e) =>
        onCommit(((e.target as HTMLElement).innerText ?? '').toString().trim())
      }
      className={(className || '') + ' cursor-text outline-none ring-1 ring-transparent focus:ring-[var(--mars-blue-primary)]/40 rounded-sm px-0.5'}
    >
      {safe}
    </span>
  );
}
