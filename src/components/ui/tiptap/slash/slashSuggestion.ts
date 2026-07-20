import type { SuggestionOptions } from "@tiptap/suggestion";
import { SlashCommand } from "./SlashCommand";

export const slashSuggestion: Omit<SuggestionOptions, "editor"> = {
  char: "/",
  startOfLine: false,
  command: ({ editor, range, props }: any) => {
    props.command({ editor, range });
  },
  ...SlashCommand,
};
