
import { Editor } from "@tiptap/react";
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

import { ToolbarButton } from "./ToolbarButton";
import { Divider } from "./Divider";

interface ToolbarProps {
  editor: Editor;
}

export const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) {
    return null;
  }

  const isInTable = editor.isActive("table");

  return (
    <div className="kb-toolbar">
      {/* Formatação inline */}
      <ToolbarButton
        title="Negrito (Ctrl+B)"
        active={editor.isActive("bold")}
        icon={<Bold size={14} />}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        title="Itálico (Ctrl+I)"
        active={editor.isActive("italic")}
        icon={<Italic size={14} />}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        title="Sublinhado (Ctrl+U)"
        active={editor.isActive("underline")}
        icon={<UnderlineIcon size={14} />}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <Divider />

      {/* Títulos */}
      <ToolbarButton
        title="Título 1 (# + Espaço)"
        active={editor.isActive("heading", { level: 1 })}
        icon={<Heading1 size={14} />}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        title="Título 2 (## + Espaço)"
        active={editor.isActive("heading", { level: 2 })}
        icon={<Heading2 size={14} />}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />

      <Divider />

      {/* Listas */}
      <ToolbarButton
        title="Lista de tópicos (- + Espaço)"
        active={editor.isActive("bulletList")}
        icon={<List size={14} />}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        title="Lista numerada (1. + Espaço)"
        active={editor.isActive("orderedList")}
        icon={<ListOrdered size={14} />}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <Divider />

      {/* Blocos */}
      <ToolbarButton
        title="Citação (> + Espaço)"
        active={editor.isActive("blockquote")}
        icon={<Quote size={14} />}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <ToolbarButton
        title="Bloco de código terminal"
        active={editor.isActive("codeBlock")}
        icon={<Code2 size={14} />}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
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

      <ToolbarButton
        title="Inserir link"
        icon={<Link2 size={14} />}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("Digite a URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      />

      <Divider />

      {/* Histórico */}
      <ToolbarButton
        title="Desfazer (Ctrl+Z)"
        icon={<Undo2 size={14} />}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        title="Refazer (Ctrl+Y)"
        icon={<Redo2 size={14} />}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  );
};
