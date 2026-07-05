import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, type ToastItem } from '../../lib/toastStore';

// ── Config visual por tipo ────────────────────────────────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    bg:   'var(--color-success-subtle)',
    border:'var(--color-success)',
    color: 'var(--color-success)',
  },
  error: {
    icon: AlertCircle,
    bg:   'var(--color-error-subtle)',
    border:'var(--color-error)',
    color: 'var(--color-error)',
  },
  warning: {
    icon: AlertTriangle,
    bg:   'var(--color-warning-subtle)',
    border:'var(--color-warning)',
    color: 'var(--color-warning)',
  },
  info: {
    icon: Info,
    bg:   'var(--color-accent-dim)',
    border:'var(--color-accent)',
    color: 'var(--color-accent-text)',
  },
} as const;

// ── Toast individual ──────────────────────────────────────────────────────────
function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismissToast);
  const cfg = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;
  const ref = useRef<HTMLDivElement>(null);

  // Animação de entrada via CSS class adicionada após mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Garante que a transição de entrada seja visível
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: `1px solid ${cfg.border}`,
        backgroundColor: cfg.bg,
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '360px',
        minWidth: '260px',
        opacity: 0,
        transform: 'translateY(8px)',
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Icon size={16} style={{ color: cfg.color, marginTop: '1px', flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 500,
          color: cfg.color,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Fechar notificação"
        style={{
          flexShrink: 0,
          color: cfg.color,
          opacity: 0.6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Container de Toasts ───────────────────────────────────────────────────────
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificações do sistema"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 'var(--z-toast)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
