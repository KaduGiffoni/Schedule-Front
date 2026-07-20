import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, History, Loader2, AlertCircle } from 'lucide-react';

import { knowledgeBaseService } from '../api/knowledgeBaseService';
import { type ArticleHistoryEntry } from '../types';
import { Button } from '../../../components/ui/Button';
import { useToastStore } from '../../../lib/toastStore';

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ArticleHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);

  const [history, setHistory] = useState<ArticleHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await knowledgeBaseService.articles.getHistory(id);
        setHistory(data);
      } catch (err) {
        setLoadError('Erro ao carregar histórico do artigo.');
        showToast('Não foi possível carregar o histórico de edições.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, showToast]);

  if (isLoading) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 h-full"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-[14px] text-[var(--color-text-faint)] font-medium">
          Carregando histórico...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 h-full px-8 text-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
        >
          <AlertCircle size={28} />
        </div>
        <p className="text-[18px] font-bold text-[var(--color-text)]">
          {loadError}
        </p>
        <Button variant="outline" onClick={() => navigate(`/base-conhecimento/${id}`)}>
          <ArrowLeft size={15} />
          Voltar ao Artigo
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ── Barra de navegação superior ──────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] shrink-0"
        style={{ backgroundColor: 'var(--color-surface)', backdropFilter: 'blur(8px)' }}
      >
        <button
          type="button"
          onClick={() => navigate(`/base-conhecimento/${id}`)}
          className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
        >
          <ArrowLeft size={15} />
          Voltar ao Artigo
        </button>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-[13px] text-[var(--color-text)] font-semibold truncate flex-1">
          Histórico de Edições
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[700px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center">
              <History size={20} />
            </div>
            <h1 className="text-[24px] font-extrabold text-[var(--color-text)] tracking-tight">
              Histórico de Versões
            </h1>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-faint)]">
              <p>Nenhuma edição registrada.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[var(--color-border)] ml-4 space-y-8 pb-8">
              {history.map((entry, idx) => {
                const editor = entry.editor || entry.updatedBy;
                return (
                  <div key={entry.id || idx} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-accent)]" />
                    
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-bold text-[var(--color-accent)] flex items-center gap-1.5">
                          Versão {entry.version}
                        </span>
                        <span className="text-[12px] text-[var(--color-text-faint)] flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-[14px] text-[var(--color-text)] mb-4">
                        {entry.changeDescription || 'Sem descrição de alteração.'}
                      </p>

                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                        <span className="text-[11px] font-semibold text-[var(--color-text-faint)] uppercase tracking-wider">
                          Editado por:
                        </span>
                        {editor ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] flex items-center justify-center text-[10px] font-bold">
                              {editor.completeName ? editor.completeName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span className="text-[12px] font-medium text-[var(--color-text)]">
                              {editor.completeName || 'Usuário Desconhecido'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--color-text-muted)]">Sistema</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
