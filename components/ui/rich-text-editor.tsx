import React from "react";
import MarkdownEditable from "@/components/MarkdownEditable";

type AnySetter = ((v: string) => void) | undefined;

/**
 * Универсальный враппер над MarkdownEditable.
 * Поддерживает старые пропсы:
 *  - value | text | content
 *  - onChange | setValue | setText | onInput
 *  - placeholder, className
 */

function RichTextEditorImpl(props: any) {
  const value: string = props?.value ?? props?.text ?? props?.content ?? "";

  const setter: AnySetter =
    props?.onChange ?? props?.setValue ?? props?.setText ?? props?.onInput;

  const onChange = (next: string) => {
    if (typeof setter === "function") setter(next);
  };

  return (
    <MarkdownEditable
      value={value}
      onChange={onChange}
      placeholder={props?.placeholder || "Write text in **Markdown**"}
      className={props?.className}
    />
  );
}

export default RichTextEditorImpl;
export const RichTextEditor = RichTextEditorImpl;
