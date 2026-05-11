import React from "react";
import { AlertCircle } from "lucide-react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ElementType;
  error?: string;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  icon: Icon,
  error,
  rightElement,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      <label
        htmlFor={id}
        className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74777d]">
            <Icon size={16} />
          </div>
        )}
        <input
          id={id}
          className={`w-full h-[40px] ${Icon ? "pl-9" : "pl-3"} ${rightElement ? "pr-10" : "pr-3"} 
                     text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border 
                     ${error ? "border-[#ba1a1a] bg-[#ffdad6]/20" : "border-[#c4c6cd]"} 
                     rounded-[4px] focus:outline-none focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] transition-colors
                     ${className || ""}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-1 text-[#ba1a1a] text-[12px]">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
