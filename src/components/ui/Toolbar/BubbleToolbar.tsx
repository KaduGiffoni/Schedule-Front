
import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { Bold, Italic, Underline, Link2, Code2 } from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";

interface Props {
  editor: Editor;
}

export default function BubbleToolbar({ editor }: Props) {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu editor={editor}>
      <div className="bubble-toolbar">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          icon={<Bold size={16} />}
          title="Negrito"
        />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          icon={<Italic size={16} />}
          title="Itálico"
        />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          icon={<Underline size={16} />}
          title="Sublinhado"
        />

        <ToolbarButton
          onClick={() => {
            const url = window.prompt("URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          active={editor.isActive("link")}
          icon={<Link2 size={16} />}
          title="Inserir Link"
        />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          icon={<Code2 size={16} />}
          title="Código inline"
        />
      </div>
    </BubbleMenu>
  );
}
