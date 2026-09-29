import { useEffect } from 'react';

export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · Harumnesia`;
  }, [title]);

  return null;
}
