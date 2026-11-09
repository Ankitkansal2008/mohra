import { useEffect } from 'react';

// Updates the document title and meta description tag on route transition
export function usePageMetadata(title: string, description: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [title, description]);
}

