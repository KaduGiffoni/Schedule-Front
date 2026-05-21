import React from "react";

import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import Mention from "@tiptap/extension-mention";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Table as TableIcon,
  Undo2,
  Redo2,
  Code2,
} from "lucide-react";

import { suggestion } from "./tiptap/suggestion";

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,

      Underline,

      Link.configure({
        openOnClick: false,
      }),

      Placeholder.configure({
        placeholder:
          "Digite uma atualização técnica, passagem de turno ou aviso...",
      }),

      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),

      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },

        suggestion,
      }),

      Table.configure({
        resizable: true,
      }),

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
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[260px] p-5 text-[14px] overflow-y-auto bg-[#fbf9fa]",
      },
    },
  });

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active, icon, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        w-9 h-9 rounded-[6px]
        flex items-center justify-center
        transition-all
        border
        ${
          active
            ? "bg-[#0058be] text-white border-[#0058be]"
            : "bg-white text-[#44474c] border-transparent hover:bg-[#eef4ff]"
        }
      `}
    >
      {icon}
    </button>
  );

  return (
    <div className="w-full border border-[#c4c6cd] rounded-[10px] overflow-hidden bg-white shadow-sm">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-[#e4e2e3] bg-[#f8fafc]">
        <ToolbarButton
          title="Negrito"
          active={editor.isActive("bold")}
          icon={<Bold size={16} />}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />

        <ToolbarButton
          title="Itálico"
          active={editor.isActive("italic")}
          icon={<Italic size={16} />}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />

        <ToolbarButton
          title="Sublinhado"
          active={editor.isActive("underline")}
          icon={<UnderlineIcon size={16} />}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <div className="w-px bg-[#d7dbe2] mx-1" />

        <ToolbarButton
          title="Título 1"
          active={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 size={16} />}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />

        <ToolbarButton
          title="Título 2"
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 size={16} />}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />

        <div className="w-px bg-[#d7dbe2] mx-1" />

        <ToolbarButton
          title="Lista"
          active={editor.isActive("bulletList")}
          icon={<List size={16} />}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />

        <ToolbarButton
          title="Lista Numerada"
          active={editor.isActive("orderedList")}
          icon={<ListOrdered size={16} />}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarButton
          title="Citação"
          active={editor.isActive("blockquote")}
          icon={<Quote size={16} />}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <ToolbarButton
          title="Código"
          active={editor.isActive("codeBlock")}
          icon={<Code2 size={16} />}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />

        <div className="w-px bg-[#d7dbe2] mx-1" />

        <ToolbarButton
          title="Tabela"
          icon={<TableIcon size={16} />}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
              })
              .run()
          }
        />

        <ToolbarButton
          title="Link"
          icon={<Link2 size={16} />}
          onClick={() => {
            const url = window.prompt("Digite a URL");

            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        />

        <div className="w-px bg-[#d7dbe2] mx-1" />

        <ToolbarButton
          title="Desfazer"
          icon={<Undo2 size={16} />}
          onClick={() => editor.chain().focus().undo().run()}
        />

        <ToolbarButton
          title="Refazer"
          icon={<Redo2 size={16} />}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/* EDITOR */}
      <EditorContent editor={editor} />
    </div>
  );
};
