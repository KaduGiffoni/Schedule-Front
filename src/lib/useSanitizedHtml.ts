import { useMemo } from 'react';
import DOMPurify from 'dompurify';

// FIX: 1 — sanitização DOMPurify adicionada

export function useSanitizedHtml(html: string): string {
  return useMemo(() => {
    if (!html) return '';
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
        'strong', 'em', 'code', 'pre', 'table', 'tr', 'td', 'th',
        'a', 'img', 'blockquote', 'br', 'hr', 'span', 'div'
      ],
      ALLOWED_ATTR: ['class', 'href', 'src', 'alt', 'target', 'rel', 'style'],
      ADD_ATTR: ['data-*'],
    });
  }, [html]);
}

// Add a hook to ensure target="_blank" is secure
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName.toLowerCase() === 'a') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
