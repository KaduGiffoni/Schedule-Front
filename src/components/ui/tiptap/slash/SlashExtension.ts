import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { slashSuggestion } from "./slashSuggestion";

export const SlashExtension = Extension.create({
  name: "slash-command",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...slashSuggestion,
      }),
    ];
  },
});
