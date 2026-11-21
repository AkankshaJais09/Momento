// Custom hook to set document title and meta description per screen.
// Updates document.title and the meta[name="description"] tag on navigation.

import { useEffect } from 'react';

export function useDocumentMeta(title, description) {
  useEffect(() => {
    if (title) {
      document.title = title.includes('PhotoDrop') ? title : `${title} - PhotoDrop`;
    }

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);
}
