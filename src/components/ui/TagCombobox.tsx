import React, { useState, useRef, useEffect } from 'react';
import { TagIcon, Check, X } from 'lucide-react';
import type { Tag } from '../../features/knowledge-base/types';

interface TagComboboxProps {
  allTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  error?: string;
}

export function TagCombobox({ allTags, selectedTagIds, onChange, error }: TagComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = allTags.filter((t) => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="w-full min-h-[38px] px-2 py-1.5 rounded-[8px] flex flex-wrap items-center gap-1.5 cursor-text kb-transition-border bg-[var(--color-surface)]"
        style={{
          border: `1px solid ${error ? 'var(--color-error)' : isOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
        onClick={() => setIsOpen(true)}
      >
        {selectedTagIds.map((tagId) => {
          const tag = allTags.find(t => t.id === tagId);
          if (!tag) return null;
          return (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12px] font-semibold bg-[var(--color-surface-dim)] text-[var(--color-text)] border border-[var(--color-border)]"
            >
              <TagIcon size={12} className="text-[var(--color-accent)]" />
              {tag.name}
              <button
                type="button"
                onClick={(e) => removeTag(e, tag.id)}
                className="ml-1 text-[var(--color-text-faint)] hover:text-[var(--color-error)] transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedTagIds.length === 0 ? "Buscar ou criar tag..." : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] shadow-lg max-h-60 overflow-y-auto"
          style={{ animation: 'fadeIn 150ms ease-out' }}
        >
          {filteredTags.length > 0 ? (
            <div className="p-1">
              {filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[13px] hover:bg-[var(--color-surface-dim)] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <TagIcon size={14} className="text-[var(--color-text-muted)]" />
                      {tag.name}
                    </span>
                    {isSelected && <Check size={14} className="text-[var(--color-accent)]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-[13px] text-center text-[var(--color-text-muted)]">
              Nenhuma tag encontrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
