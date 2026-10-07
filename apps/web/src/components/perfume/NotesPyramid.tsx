import type { PerfumeDetailViewModel } from '../../features/recommendation/types.js';
import { EditorialIcon } from '../editorial/EditorialIcon.js';

export function NotesPyramid({ notes }: Pick<PerfumeDetailViewModel, 'notes'>) {
  const layers = [
    ['Top', notes.top],
    ['Middle', notes.middle],
    ['Base', notes.base],
  ] as const;
  return (
    <div className="notes-pyramid">
      <div className="notes-pyramid__illustration" aria-hidden="true">
        {layers
          .filter(([, values]) => values.length > 0)
          .map(([label]) => (
            <span key={label}>
              <EditorialIcon name="note" />
            </span>
          ))}
      </div>
      <div className="notes-pyramid__tiers">
        {layers
          .filter(([, values]) => values.length > 0)
          .map(([label, values]) => (
            <div className="notes-pyramid__tier" key={label}>
              <span aria-hidden="true">
                {label === 'Top' ? '01' : label === 'Middle' ? '02' : '03'}
              </span>
              <div>
                <h3>{label} Notes</h3>
                <p>{values.join(' · ')}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
