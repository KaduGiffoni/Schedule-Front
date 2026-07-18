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
  Minus,
  RowsIcon,
  Columns,
  Trash2,
  PlusSquare,
} from "lucide-react";

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
      StarterKit.configure({
        codeBlock: false,
        // horizontalRule está ativo por padrão no StarterKit
        // Input rules incluídas:
        //   **texto** ou __texto__ → negrito
        //   *texto* ou _texto_    → itálico
        //   ~~texto~~             → riscado
        //   # / ## / ### ...      → títulos (com espaço após #)
        //   - ou * ou +           → lista de tópicos
        //   1.                    → lista numerada
        //   >                     → citação
        //   `código`              → código inline
        //   ---                   → separador horizontal
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
        class:
          "kb-content kb-editor-prose max-w-none focus:outline-none min-h-[260px] p-5 text-[14px]",
      },
    },
  });

  if (!editor) return null;

  // ── Sub-componentes da toolbar ─────────────────────────────────────────────

  const ToolbarButton = ({
    onClick,
    active,
    icon,
    title,
    disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    icon: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 120ms ease-out, color 120ms ease-out",
          border: active ? "1px solid var(--color-accent)" : "1px solid transparent",
          backgroundColor: active
            ? "var(--color-accent)"
            : hovered
            ? "var(--color-surface-raised)"
            : "transparent",
          color: active ? "white" : hovered ? "var(--color-text)" : "var(--color-text-muted)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
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
        margin: "0 3px",
        flexShrink: 0,
      }}
    />
  );

  // Verifica se o cursor está dentro de uma tabela
  const isInTable = editor.isActive("table");

  return (
    <div
      className={className}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        // overflow: "clip" em vez de "hidden" — mantém o border-radius sem quebrar sticky
        overflow: "clip",
        backgroundColor: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        ...style,
      }}
    >
      {/* ── TOOLBAR (sticky dentro do container do editor) ─────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "2px",
          padding: "6px 10px",
          borderBottom: "1px solid var(--color-border-subtle)",
          backgroundColor: "var(--color-surface-dim)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Formatação inline */}
        <ToolbarButton title="Negrito (Ctrl+B)" active={editor.isActive("bold")} icon={<Bold size={14} />} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton title="Itálico (Ctrl+I)" active={editor.isActive("italic")} icon={<Italic size={14} />} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton title="Sublinhado (Ctrl+U)" active={editor.isActive("underline")} icon={<UnderlineIcon size={14} />} onClick={() => editor.chain().focus().toggleUnderline().run()} />

        <Divider />

        {/* Títulos */}
        <ToolbarButton title="Título 1 (# + Espaço)" active={editor.isActive("heading", { level: 1 })} icon={<Heading1 size={14} />} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolbarButton title="Título 2 (## + Espaço)" active={editor.isActive("heading", { level: 2 })} icon={<Heading2 size={14} />} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />

        <Divider />

        {/* Listas */}
        <ToolbarButton title="Lista de tópicos (- + Espaço)" active={editor.isActive("bulletList")} icon={<List size={14} />} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton title="Lista numerada (1. + Espaço)" active={editor.isActive("orderedList")} icon={<ListOrdered size={14} />} onClick={() => editor.chain().focus().toggleOrderedList().run()} />

        <Divider />

        {/* Blocos */}
        <ToolbarButton title="Citação (> + Espaço)" active={editor.isActive("blockquote")} icon={<Quote size={14} />} onClick={() => editor.chain().focus().toggleBlockquote().run()} />

        <ToolbarButton
          title="Bloco de código terminal"
          active={editor.isActive("codeBlock")}
          icon={<Code2 size={14} />}
          onClick={() => {
            if (editor.isActive("codeBlock")) {
              editor.chain().focus().toggleCodeBlock().run();
              return;
            }
            const { from, to, empty } = editor.state.selection;
            if (empty) {
              editor.chain().focus().toggleCodeBlock().run();
              return;
            }
            const text = editor.state.doc.textBetween(from, to, "\n");
            const chunks = text.split(/\n\s*\n/);
            if (chunks.length > 1) {
              const chain = editor.chain().focus().deleteSelection();
              chunks.forEach((chunk, index) => {
                chain.insertContent(`<pre><code>${chunk}</code></pre>`);
                if (index < chunks.length - 1) chain.insertContent("<p></p>");
              });
              chain.run();
            } else {
              editor.chain().focus().toggleCodeBlock().run();
            }
          }}
        />

        {/* Separador horizontal */}
        <ToolbarButton
          title="Linha separadora (--- + Enter)"
          icon={<Minus size={14} />}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <Divider />

        {/* Tabela */}
        <ToolbarButton
          title="Inserir tabela"
          icon={<TableIcon size={14} />}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        />

        {/* Controles de tabela — só aparecem quando o cursor está dentro de uma tabela */}
        {isInTable && (
          <>
            <Divider />
            <ToolbarButton
              title="Adicionar coluna após"
              icon={<Columns size={14} />}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            />
            <ToolbarButton
              title="Adicionar linha após"
              icon={<RowsIcon size={14} />}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            />
            <ToolbarButton
              title="Remover coluna"
              icon={<Trash2 size={13} />}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            />
            <ToolbarButton
              title="Remover linha"
              icon={<PlusSquare size={13} style={{ transform: "rotate(45deg)" }} />}
              onClick={() => editor.chain().focus().deleteRow().run()}
            />
          </>
        )}

        <Divider />

        {/* Link */}
        <ToolbarButton
          title="Inserir link"
          icon={<Link2 size={14} />}
          onClick={() => {
            const url = window.prompt("Digite a URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        />

        <Divider />

        {/* Histórico */}
        <ToolbarButton title="Desfazer (Ctrl+Z)" icon={<Undo2 size={14} />} onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton title="Refazer (Ctrl+Y)" icon={<Redo2 size={14} />} onClick={() => editor.chain().focus().redo().run()} />
      </div>

      {/* ── EDITOR ─────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "var(--color-surface)", flex: 1, display: "flex", flexDirection: "column" }}>
        <EditorContent editor={editor} style={{ flex: 1, display: "flex", flexDirection: "column" }} className="h-full flex-1" />
      </div>
    </div>
  );
};
