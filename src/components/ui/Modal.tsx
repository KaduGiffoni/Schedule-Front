import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  /** Título exibido no cabeçalho */
  title: string;
  /** Chamado ao fechar (clicar fora, tecla Escape ou botão X) */
  onClose: () => void;
  /** Conteúdo principal */
  children: React.ReactNode;
  /** Largura máxima: sm=400px, md=520px (default), lg=680px */
  size?: 'sm' | 'md' | 'lg';
  /** Ícone opcional ao lado do título */
  icon?: React.ReactNode;
}

const SIZE_MAP = { sm: '400px', md: '520px', lg: '680px' };

/**
 * Modal reutilizável que segue o design system.
 * - Backdrop com blur e fade-in
 * - Fecha ao clicar fora ou pressionar Escape
 * - Bloqueia scroll do body enquanto aberto
 * - 100% var(--color-*) — dark mode funcional
 */
export function Modal({ title, onClose, children, size = 'md', icon }: ModalProps) {
  // Bloquear scroll do body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'oklch(5% 0 0 / 50%)',
          backdropFilter: 'blur(4px)',
          animation: 'modal-fade-in 180ms ease-out both',
        }}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: SIZE_MAP[size],
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-enter 220ms var(--ease-out-expo) both',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border-subtle)',
            flexShrink: 0,
          }}
        >
          {icon && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-accent-dim)',
                color: 'var(--color-accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <h2
            style={{
              flex: 1,
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-faint)',
              flexShrink: 0,
              transition: 'background-color 150ms ease-out, color 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--color-surface-dim)';
              el.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'transparent';
              el.style.color = 'var(--color-text-faint)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </div>
      </div>

      {/* Keyframes injetados inline (evita depender de um arquivo CSS extra) */}
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-enter {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
