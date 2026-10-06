import { EditorialIcon } from '../editorial/EditorialIcon.js';

export function MatchReasons({
  reasons,
  title = 'Why it fits',
}: {
  reasons: readonly string[];
  title?: string;
}) {
  if (reasons.length === 0) return null;
  return (
    <section className="match-reasons">
      <h3>{title}</h3>
      <ul>
        {reasons.map((reason) => (
          <li key={reason}>
            <EditorialIcon name="leaf" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
