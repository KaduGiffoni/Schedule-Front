import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import { TerminalCodeBlock } from "./tiptap/TerminalCodeBlock";
import { suggestion } from "./tiptap/suggestion";

export const editorExtensions = [
  StarterKit.configure({
    codeBlock: false,
  }),

  TerminalCodeBlock,

  Underline,

  Link.configure({
    openOnClick: false,
  }),

  Placeholder.configure({
    placeholder:
      "Digite o conteúdo do artigo...\n\nDicas: **negrito**, *itálico*, # título, - lista, 1. numerada, --- separador",
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
];