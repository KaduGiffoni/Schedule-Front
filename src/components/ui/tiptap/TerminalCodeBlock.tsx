/* eslint-disable react-refresh/only-export-components */
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useCallback, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import CodeBlock from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';

const FONT_MONO = 'var(--font-mono, "Geist Mono", "JetBrains Mono", monospace)';
const LINE_HEIGHT = '1.6';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeBlockComponent = ({ node }: any) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [node.textContent]);

  // Compute line count reactively from node content.
  // TipTap code blocks typically append a trailing '\n', so we strip it.
  const rawText: string = node.textContent || '';
  const lines = rawText.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const lineCount = Math.max(1, lines.length);

  return (
    <NodeViewWrapper
      className="relative group my-4 rounded-[8px] overflow-hidden border"
      style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(74, 222, 128, 0.3)' }}
    >
      {/* ── Terminal header bar ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-4 py-2 border-b select-none"
        style={{
          borderColor: 'rgba(74, 222, 128, 0.15)',
          backgroundColor: 'rgba(74, 222, 128, 0.04)',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f56' }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffbd2e' }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#27c93f' }} />
        <span
          className="ml-2 text-[11px] tracking-wider"
          style={{ fontFamily: FONT_MONO, color: 'rgba(74, 222, 128, 0.4)' }}
        >
          terminal
        </span>
      </div>

      {/* ── Copy button ────────────────────────────────────────────────── */}
      <div className="absolute top-[38px] right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#4ade80' }}
          title="Copiar código"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {/* ── Code area ──────────────────────────────────────────────────── */}
      <pre
        className="m-0 overflow-x-auto"
        style={{
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'flex-start',
          padding: '1rem',
          gap: '0.625rem',
        }}
      >
        {/* Gutter — one ">" per line, synced with node content */}
        <div
          aria-hidden="true"
          className="shrink-0 select-none"
          style={{
            fontFamily: FONT_MONO,
            fontSize: '13px',
            lineHeight: LINE_HEIGHT,
            color: '#4ade80',
            opacity: 0.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i} style={{ lineHeight: LINE_HEIGHT, display: 'block' }}>
              {'>'}
            </span>
          ))}
        </div>

        {/* Editable content — NodeViewContent must remain visible for editing */}
        <NodeViewContent
          className="kb-terminal-code flex-1"
          style={{
            fontFamily: FONT_MONO,
            fontSize: '13px',
            lineHeight: LINE_HEIGHT,
            color: '#4ade80',
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            display: 'block',
            whiteSpace: 'pre',
          }}
        />
      </pre>
    </NodeViewWrapper>
  );
};

export const TerminalCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },

  /**
   * renderHTML é o HTML que o TipTap serializa e salva.
   * Adicionamos classes identificadoras para que o CSS e o
   * ArticleViewPage possam estilizar o bloco corretamente.
   */
  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, { class: 'kb-terminal-pre' }),
      ['code', { class: 'kb-terminal-code' }, 0],
    ];
  },
});
