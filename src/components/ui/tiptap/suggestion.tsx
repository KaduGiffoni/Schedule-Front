import { ReactRenderer } from "@tiptap/react";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy from "tippy.js";
import { knowledgeBaseService } from "../../../features/knowledge-base/api/knowledgeBaseService";
import type { ArticleSummary } from "../../../features/knowledge-base/types";
import { FileText } from "lucide-react";

export const suggestion = {
  items: async ({ query }: { query: string }) => {
    try {
      const response = await knowledgeBaseService.articles.search({
        searchTerm: query,
        pageNumber: 1,
        pageSize: 5,
      });
      return response.data;
    } catch {
      return [];
    }
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

        if (!props.clientRect) {
          return;
        }

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

        if (!props.clientRect) {
          return;
        }

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

const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.title });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] shadow-lg overflow-hidden min-w-[280px] text-[var(--color-text)]">
      {props.items.length ? (
        props.items.map((item: ArticleSummary, index: number) => (
          <div
            key={item.id}
            className="group relative"
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <button
              className={`block w-full text-left px-3 py-2 text-[13px] transition-colors flex items-center gap-2 ${
                index === selectedIndex
                  ? "bg-[var(--color-surface-dim)]"
                  : "bg-transparent"
              }`}
              onClick={() => selectItem(index)}
            >
              <FileText size={14} className="text-[var(--color-accent)]" />
              <span className="truncate">{item.title}</span>
            </button>
            
            {/* Tooltip Hover Lateral */}
            {index === selectedIndex && item.summary && (
              <div 
                className="absolute left-full top-0 ml-2 w-64 p-3 bg-[var(--color-surface-dim)] border border-[var(--color-border)] rounded-[8px] shadow-xl text-[12px] text-[var(--color-text-muted)] z-[100]"
                style={{ animation: 'fadeIn 150ms ease-out' }}
              >
                <div className="font-bold text-[var(--color-text)] mb-1">Resumo</div>
                {item.summary}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="px-3 py-2 text-[13px] text-[var(--color-text-faint)]">
          Nenhum artigo encontrado
        </div>
      )}
    </div>
  );
});