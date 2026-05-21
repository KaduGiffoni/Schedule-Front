import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";

const users = [
  "kadu",
  "carlos",
  "gilberto",
  "wallace",
  "juan",
  "carol",
];

export const suggestion = {
  items: ({ query }: any) => {
    return users
      .filter((item) =>
        item.toLowerCase().startsWith(query.toLowerCase()),
      )
      .slice(0, 5);
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup[0].hide();

          return true;
        }

        return component.ref?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};

function MentionList(props: any) {
  return (
    <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden min-w-[180px]">
      {props.items.length ? (
        props.items.map((item: string, index: number) => (
          <button
            key={index}
            className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
            onClick={() => props.command({ id: item, label: item })}
          >
            @{item}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">
          Nenhum usuário
        </div>
      )}
    </div>
  );
}