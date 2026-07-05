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
          "prose prose-sm max-w-none focus:outline-none min-h-[260px] p-5 text-[14px] overflow-y-auto",
      },
    },
  });

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    icon,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    icon: React.ReactNode;
    title: string;
  }) => {
    const [hovered, setHovered] = React.useState(false);

    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        aria-pressed={active}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 120ms ease-out, color 120ms ease-out",
          border: active
            ? "1px solid var(--color-accent)"
            : "1px solid transparent",
          backgroundColor: active
            ? "var(--color-accent)"
            : hovered
            ? "var(--color-surface-dim)"
            : "transparent",
          color: active
            ? "white"
            : hovered
            ? "var(--color-text)"
            : "var(--color-text-muted)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {icon}
      </button>
    );
  };

  const Divider = () => (
    <div
      style={{
        width: "1px",
        alignSelf: "stretch",
        backgroundColor: "var(--color-border)",
        margin: "0 2px",
      }}
    />
  );

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          padding: "8px 12px",
          borderBottom: "1px solid var(--color-border-subtle)",
          backgroundColor: "var(--color-surface-dim)",
        }}
      >
        <ToolbarButton
          title="Negrito"
          active={editor.isActive("bold")}
          icon={<Bold size={15} />}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />

        <ToolbarButton
          title="Itálico"
          active={editor.isActive("italic")}
          icon={<Italic size={15} />}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />

        <ToolbarButton
          title="Sublinhado"
          active={editor.isActive("underline")}
          icon={<UnderlineIcon size={15} />}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />

        <Divider />

        <ToolbarButton
          title="Título 1"
          active={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 size={15} />}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />

        <ToolbarButton
          title="Título 2"
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 size={15} />}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />

        <Divider />

        <ToolbarButton
          title="Lista"
          active={editor.isActive("bulletList")}
          icon={<List size={15} />}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />

        <ToolbarButton
          title="Lista Numerada"
          active={editor.isActive("orderedList")}
          icon={<ListOrdered size={15} />}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarButton
          title="Citação"
          active={editor.isActive("blockquote")}
          icon={<Quote size={15} />}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <ToolbarButton
          title="Código"
          active={editor.isActive("codeBlock")}
          icon={<Code2 size={15} />}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />

        <Divider />

        <ToolbarButton
          title="Tabela"
          icon={<TableIcon size={15} />}
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
          icon={<Link2 size={15} />}
          onClick={() => {
            const url = window.prompt("Digite a URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        />

        <Divider />

        <ToolbarButton
          title="Desfazer"
          icon={<Undo2 size={15} />}
          onClick={() => editor.chain().focus().undo().run()}
        />

        <ToolbarButton
          title="Refazer"
          icon={<Redo2 size={15} />}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/* EDITOR */}
      <div style={{ backgroundColor: "var(--color-surface)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
