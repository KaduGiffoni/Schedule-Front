import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className = '', disabled, ...props 
}) => {
  const baseStyle = "w-full h-[40px] rounded-[4px] text-[14px] font-medium transition-all flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-[#0058be] text-white hover:bg-[#2170e4] active:scale-[0.99] disabled:bg-[#0058be]/50",
    outline: "bg-transparent text-[#1b1c1d] border border-[#c4c6cd] hover:bg-[#f5f3f4] disabled:opacity-50",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Processing...
        </span>
      ) : children}
    </button>
  );
};