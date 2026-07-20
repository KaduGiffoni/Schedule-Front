import type { Editor, Range } from "@tiptap/react";

export interface SlashItem {
  title: string;
  description: string;
  searchTerms: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

export const slashItems: SlashItem[] = [
  {
    title: "Título 1",
    description: "# Grande",
    searchTerms: ["h1", "titulo"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Título 2",
    description: "## Médio",
    searchTerms: ["h2"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Lista",
    description: "Lista com marcadores",
    searchTerms: ["bullet"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Lista Numerada",
    description: "1. Lista",
    searchTerms: ["ordered"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Citação",
    description: "> bloco",
    searchTerms: ["quote"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Linha",
    description: "---",
    searchTerms: ["hr"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Código",
    description: "Terminal",
    searchTerms: ["terminal", "code"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Tabela",
    description: "3x3",
    searchTerms: ["table"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];
