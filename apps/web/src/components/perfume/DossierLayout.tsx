import { useEffect, useState, type ReactNode } from 'react';

const MOBILE_QUERY = '(max-width: 63.99rem)';

/** Keep the mobile reading order without coupling the desktop column heights. */
export function DossierLayout({
  artwork,
  intro,
  reasons,
  notes,
  character,
  sparse,
}: {
  artwork: ReactNode;
  intro: ReactNode;
  reasons: ReactNode;
  notes: ReactNode;
  character: ReactNode;
  sparse: boolean;
}) {
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.(MOBILE_QUERY).matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_QUERY);
    if (!query) return;
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (mobile) {
    return (
      <>
        {artwork}
        {intro}
        {reasons}
        {notes}
        {character}
      </>
    );
  }

  return (
    <>
      <div className="dossier__visual-column">
        {artwork}
        {!sparse ? notes : null}
      </div>
      <div className="dossier__content-column">
        {intro}
        <div className="dossier__lower">
          {reasons}
          {character}
        </div>
        {sparse ? notes : null}
      </div>
    </>
  );
}
