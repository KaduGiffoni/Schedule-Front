import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../../lib/toastStore';
import { useHasRole } from '../../../lib/useHasRole';
import { knowledgeBaseService } from '../api/knowledgeBaseService';
import type { Tag, CategoryTreeNode } from '../types';
import { Button } from '../../../components/ui/Button';
import { InputField } from '../../../components/ui/InputField';
import { ArrowLeft, Tag as TagIcon, Folder, Trash2, Plus, Loader2 } from 'lucide-react';

export default function KnowledgeBaseSettingsPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  // RB002/RB003: s\u00f3 Admin ou Manager podem aceder \u00e0s configura\u00e7\u00f5es
  const canEdit = useHasRole('Admin', 'Manager');

  const [activeTab, setActiveTab] = useState<'tags' | 'categories'>('categories');

  // Tags State
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [isTagCreating, setIsTagCreating] = useState(false);

  // Categories State
  const [categoriesTree, setCategoriesTree] = useState<CategoryTreeNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<{ id: string; label: string }[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(true);
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [isCatCreating, setIsCatCreating] = useState(false);
  
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Guard
  useEffect(() => {
    if (!canEdit) {
      showToast('Sem permissão para aceder às configurações.', 'error');
      navigate('/base-conhecimento');
    }
  }, [canEdit, navigate, showToast]);

  // Load Data
  useEffect(() => {
    loadTags();
    loadCategories();
  }, []);

  const loadTags = async () => {
    setIsTagsLoading(true);
    try {
      const data = await knowledgeBaseService.tags.getAll();
      setTags(data);
    } catch {
      showToast('Erro ao carregar tags.', 'error');
    } finally {
      setIsTagsLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsCatLoading(true);
    try {
      const tree = await knowledgeBaseService.categories.getTree();
      setCategoriesTree(tree);
      
      const flat: { id: string; label: string }[] = [];
      const traverse = (nodes: CategoryTreeNode[], level = 0) => {
        nodes.forEach((node) => {
          flat.push({
            id: node.id,
            label: `${'—'.repeat(level)} ${node.name}`.trim(),
          });
          if (node.children && node.children.length > 0) {
            traverse(node.children, level + 1);
          }
        });
      };
      traverse(tree);
      setFlatCategories(flat);
    } catch {
      showToast('Erro ao carregar categorias.', 'error');
    } finally {
      setIsCatLoading(false);
    }
  };

  // Tag Actions
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setIsTagCreating(true);
    try {
      await knowledgeBaseService.tags.create({ name: newTagName.trim() });
      showToast('Tag criada com sucesso!', 'success');
      setNewTagName('');
      await loadTags();
    } catch {
      showToast('Erro ao criar tag. Pode já existir.', 'error');
    } finally {
      setIsTagCreating(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta tag?')) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await knowledgeBaseService.tags.remove(id);
      showToast('Tag apagada.', 'success');
      await loadTags();
    } catch {
      showToast('Erro ao apagar tag.', 'error');
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCatCreating(true);
    try {
      await knowledgeBaseService.categories.create({
        name: newCatName.trim(),
        parentCategoryId: newCatParent || null,
      });
      showToast('Categoria criada com sucesso!', 'success');
      setNewCatName('');
      setNewCatParent('');
      await loadCategories();
    } catch {
      showToast('Erro ao criar categoria.', 'error');
    } finally {
      setIsCatCreating(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta categoria? Todos os artigos associados poderão ficar sem categoria.')) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await knowledgeBaseService.categories.remove(id);
      showToast('Categoria apagada.', 'success');
      await loadCategories();
    } catch {
      showToast('Erro ao apagar categoria. Pode ter sub-categorias.', 'error');
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const renderCategoryTree = (nodes: CategoryTreeNode[], level = 0) => {
    return (
      <ul className={level > 0 ? 'ml-6 mt-2 border-l border-[var(--color-border)] pl-4' : 'space-y-2'}>
        {nodes.map((node) => (
          <li key={node.id} className="py-1">
            <div
              className="flex items-center justify-between p-3 rounded-[8px] border transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                opacity: deletingIds.has(node.id) ? 0.5 : 1,
                transform: deletingIds.has(node.id) ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              <div className="flex items-center gap-2">
                <Folder size={15} style={{ color: 'var(--color-accent)' }} />
                <span className="text-[14px] font-semibold text-[var(--color-text)]">{node.name}</span>
                {node.articleCount !== undefined && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-dim)] text-[var(--color-text-faint)]">
                    {node.articleCount} artigo{node.articleCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(node.id)}
                disabled={deletingIds.has(node.id)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Apagar categoria"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {node.children && node.children.length > 0 && renderCategoryTree(node.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ── Top Bar ── */}
      <div
        className="shrink-0 flex items-center gap-4 px-8 py-5 border-b"
        style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface)' }}
      >
        <button
          onClick={() => navigate('/base-conhecimento')}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-faint)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="w-[1px] h-4 bg-[var(--color-border)]" />
        <h1 className="text-[20px] font-bold text-[var(--color-text)]">
          Configurações da Base de Conhecimento
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[800px] mx-auto">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-[var(--color-border-subtle)]">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-3 text-[14px] font-bold border-b-2 transition-colors ${
                activeTab === 'categories'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder size={16} />
                Categorias
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-3 text-[14px] font-bold border-b-2 transition-colors ${
                activeTab === 'tags'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <TagIcon size={16} />
                Tags
              </span>
            </button>
          </div>

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="flex flex-col gap-8">
              <div className="p-5 rounded-[12px] border bg-[var(--color-surface-dim)] border-[var(--color-border)]">
                <h3 className="text-[14px] font-bold text-[var(--color-text)] mb-4">Nova Categoria</h3>
                <form onSubmit={handleCreateCategory} className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <InputField
                      id="cat-name"
                      label="Nome da Categoria"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Ex: Redes"
                      maxLength={50}
                    />
                    <div style={{ position: 'absolute', top: 0, right: 0 }}>
                       <span className="text-[10px] text-[var(--color-text-faint)]">{newCatName.length}/50</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-[var(--color-text-muted)] mb-1.5">
                      Categoria Mãe (Opcional)
                    </label>
                    <select
                      value={newCatParent}
                      onChange={(e) => setNewCatParent(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] text-[13px] border outline-none"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    >
                      <option value="">Nenhuma (Raiz)</option>
                      {flatCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={isCatCreating || !newCatName.trim()} isLoading={isCatCreating}>
                    <Plus size={16} />
                    Criar
                  </Button>
                </form>
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <Folder size={18} />
                  Estrutura de Categorias
                </h3>
                {isCatLoading ? (
                  <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
                    <Loader2 className="animate-spin" size={16} /> Carregando...
                  </div>
                ) : categoriesTree.length === 0 ? (
                  <p className="text-[14px] text-[var(--color-text-faint)]">Nenhuma categoria encontrada.</p>
                ) : (
                  renderCategoryTree(categoriesTree)
                )}
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="flex flex-col gap-8">
              <div className="p-5 rounded-[12px] border bg-[var(--color-surface-dim)] border-[var(--color-border)]">
                <h3 className="text-[14px] font-bold text-[var(--color-text)] mb-4">Nova Tag</h3>
                <form onSubmit={handleCreateTag} className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <InputField
                      id="tag-name"
                      label="Nome da Tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Ex: Cisco"
                      maxLength={50}
                    />
                    <div style={{ position: 'absolute', top: 0, right: 0 }}>
                       <span className="text-[10px] text-[var(--color-text-faint)]">{newTagName.length}/50</span>
                    </div>
                  </div>
                  <Button type="submit" disabled={isTagCreating || !newTagName.trim()} isLoading={isTagCreating}>
                    <Plus size={16} />
                    Criar
                  </Button>
                </form>
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <TagIcon size={18} />
                  Tags Cadastradas
                </h3>
                {isTagsLoading ? (
                  <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
                    <Loader2 className="animate-spin" size={16} /> Carregando...
                  </div>
                ) : tags.length === 0 ? (
                  <p className="text-[14px] text-[var(--color-text-faint)]">Nenhuma tag encontrada.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          opacity: deletingIds.has(tag.id) ? 0.5 : 1,
                          transform: deletingIds.has(tag.id) ? 'scale(0.95)' : 'scale(1)',
                        }}
                      >
                        <TagIcon size={12} style={{ color: 'var(--color-accent)' }} />
                        <span className="text-[13px] font-semibold text-[var(--color-text)]">{tag.name}</span>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={deletingIds.has(tag.id)}
                          className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-error-subtle)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
