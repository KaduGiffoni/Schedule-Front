import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: React.ReactNode;
  iconSize?: number;
  align?: 'center' | 'right' | 'left';
}

export function HelpTooltip({ content, iconSize = 14, align = 'center' }: HelpTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center" 
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={iconSize} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors cursor-help" />
      
      {show && (
        <div 
          className="absolute z-[100] w-64 p-3 text-[12px] rounded-[8px] border shadow-lg leading-relaxed bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
          style={{ 
            top: 'calc(100% + 8px)', 
            left: align === 'center' ? '50%' : align === 'left' ? '0' : 'auto',
            right: align === 'right' ? '0' : 'auto',
            transform: align === 'center' ? 'translateX(-50%)' : 'none',
            animation: 'fadeIn 150ms ease-out'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
