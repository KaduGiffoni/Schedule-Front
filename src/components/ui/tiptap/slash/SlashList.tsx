import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SlashItem } from "./slashItems";

interface SlashListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export const SlashList = forwardRef((props: SlashListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return <div className="slash-menu slash-menu-empty">Nenhum comando encontrado</div>;
  }

  return (
    <div className="slash-menu">
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`slash-item ${index === selectedIndex ? "is-selected" : ""}`}
          onClick={() => selectItem(index)}
        >
          <span className="slash-item-title">{item.title}</span>
          <span className="slash-item-description">{item.description}</span>
        </button>
      ))}
    </div>
  );
});

SlashList.displayName = "SlashList";
