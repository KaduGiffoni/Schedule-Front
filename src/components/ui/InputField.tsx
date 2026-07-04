import React, { useId } from "react";
import { AlertCircle } from "lucide-react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ElementType;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  id: idProp,
  icon: Icon,
  error,
  hint,
  rightElement,
  className,
  onFocus,
  onBlur,
  ...props
}) => {
  const autoId = useId();
  const id = idProp ?? autoId;

  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? "var(--color-error)"
    : isFocused
    ? "var(--color-accent)"
    : "var(--color-border)";

  const boxShadow =
    isFocused && !error
      ? "0 0 0 3px var(--color-accent-dim)"
      : isFocused && error
      ? "0 0 0 3px oklch(46% 0.22 22 / 15%)"
      : "none";

  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      <label
        htmlFor={id}
        className="text-[12px] font-semibold"
        style={{ color: error ? "var(--color-error)" : "var(--color-text-muted)" }}
      >
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150"
            style={{ color: isFocused ? "var(--color-accent)" : "var(--color-text-faint)" }}
          >
            <Icon size={15} strokeWidth={1.8} />
          </div>
        )}

        <input
          id={id}
          className={`w-full h-[40px] text-[14px] rounded-[6px] ${
            Icon ? "pl-9" : "pl-3"
          } ${rightElement ? "pr-10" : "pr-3"} ${className ?? ""}`}
          style={{
            backgroundColor: error
              ? "oklch(from var(--color-error-subtle) l c h / 40%)"
              : "var(--color-surface-dim)",
            border: `1px solid ${borderColor}`,
            color: "var(--color-text)",
            outline: "none",
            boxShadow,
            transition:
              "border-color 150ms ease-out, box-shadow 150ms ease-out, background-color 150ms ease-out",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {/* Mensagem de erro — abaixo do input */}
      {error && (
        <div
          className="flex items-center gap-1.5 text-[12px] font-medium mt-0.5"
          style={{ color: "var(--color-error)" }}
          role="alert"
        >
          <AlertCircle size={12} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* Dica opcional — sem erro */}
      {hint && !error && (
        <p className="text-[11.5px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
};
