import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TerminalCodeBlock } from "./tiptap/TerminalCodeBlock";
import Mention from "@tiptap/extension-mention";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import DragHandle from "@tiptap/extension-drag-handle";
import { SlashExtension } from "./tiptap/slash/SlashExtension";
import BubbleToolbar from "./Toolbar/BubbleToolbar";
import { Toolbar } from "./Toolbar/Toolbar";
import { suggestion } from "./tiptap/suggestion";

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const RichTextEditor = ({ content, onChange, className, style }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      DragHandle.configure({
        render() {
          const element = document.createElement("div");
          element.classList.add("custom-drag-handle");
          element.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
          return element;
        },
      }),
      SlashExtension,
      StarterKit.configure({
        codeBlock: false,
      }),
      TerminalCodeBlock,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Digite o conteúdo do artigo...\n\nDicas: **negrito**, *itálico*, # Título, - lista, 1. numerada, --- separador",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],

    content,

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },

    editorProps: {
      attributes: {
        class: "kb-content kb-editor-prose max-w-none focus:outline-none min-h-[260px] p-5 text-[14px]",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={`kb-editor-container ${className || ""}`} style={style}>
      <Toolbar editor={editor} />

      <div className="kb-editor-content-wrapper">
        <BubbleToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
