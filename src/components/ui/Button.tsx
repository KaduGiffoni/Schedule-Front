import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  /** Só use quando o botão realmente precisa ocupar 100% da largura do container
   *  (ex: botão de submit sozinho em um formulário estreito). Por padrão o botão
   *  tem largura de conteúdo, como qualquer botão normal. */
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading,
  fullWidth = false,
  className = "",
  disabled,
  style,
  ...props
}) => {
  const isDisabled = isLoading || disabled;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { height: "32px", padding: "0 12px", fontSize: "12px" },
    md: { height: "40px", padding: "0 16px", fontSize: "14px" },
    lg: { height: "48px", padding: "0 20px", fontSize: "15px" },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--color-accent)",
      color: "white",
      border: "none",
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--color-text-muted)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--color-text-muted)",
      border: "none",
    },
    danger: {
      backgroundColor: "var(--color-error-subtle)",
      color: "var(--color-error)",
      border: "1px solid var(--color-error)",
    },
  };

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: "var(--color-accent-hover)" },
    outline: { backgroundColor: "var(--color-surface-raised)", color: "var(--color-text)" },
    ghost: { backgroundColor: "var(--color-surface-raised)", color: "var(--color-text)" },
    danger: { backgroundColor: "var(--color-error)", color: "white" },
  };

  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <button
      className={`${fullWidth ? "w-full" : "w-auto"} inline-flex items-center justify-center gap-2 font-semibold rounded-[6px] select-none ${className}`}
      disabled={isDisabled}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...(isHovered && !isDisabled ? hoverStyles[variant] : {}),
        transform: isPressed && !isDisabled ? "scale(0.97)" : "scale(1)",
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        // Transições específicas — nunca `transition: all`
        transition:
          "background-color 150ms ease-out, color 150ms ease-out, transform 100ms ease-out, opacity 150ms ease-out",
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2
            size={16}
            className="animate-spin"
            style={{ color: variant === "primary" ? "white" : "var(--color-accent)" }}
          />
          <span>Aguarde...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};