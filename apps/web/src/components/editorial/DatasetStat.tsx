import buildReport from '../../../../../scripts/build-dataset/build-report.json';
import { EditorialIcon } from './EditorialIcon.js';

// Small generated metadata only: importing the catalog here would defeat lazy loading.
const fragranceCount = new Intl.NumberFormat('en-US').format(
  buildReport.integrity.counts.total,
);

export function DatasetStat() {
  return (
    <div className="dataset-stat">
      <EditorialIcon name="layers" />
      <p className="dataset-stat__number">{fragranceCount}</p>
      <p className="dataset-stat__caption">
        Fragrances in the discovery dataset
        <span>Local and international fragrance records.</span>
      </p>
    </div>
  );
}
