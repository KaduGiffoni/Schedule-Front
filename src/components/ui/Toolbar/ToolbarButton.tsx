import React from "react";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
}

export const ToolbarButton = React.memo(
  ({
    onClick,
    active,
    icon,
    title,
    disabled,
  }: ToolbarButtonProps) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      if (buttonRef.current && title) {
        const instance = tippy(buttonRef.current, {
          content: title,
          placement: "top",
          animation: "fade",
          delay: [200, 0],
        });
        return () => {
          instance.destroy();
        };
      }
    }, [title]);

    return (
      <button
        ref={buttonRef}
        type="button"
        className={`kb-toolbar-button ${active ? "active" : ""}`}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";
