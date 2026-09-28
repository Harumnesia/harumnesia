import { RECOMMENDER_PACKAGE_STATUS } from '@harumnesia/recommender';
import { SHARED_PACKAGE_STATUS } from '@harumnesia/shared';

function App() {
  return (
    <main>
      <p className="eyebrow">Phase 1</p>
      <h1>Harumnesia V2</h1>
      <p>Monorepo foundation is ready for the next development phase.</p>
      <dl>
        <div>
          <dt>Shared package</dt>
          <dd>{SHARED_PACKAGE_STATUS}</dd>
        </div>
        <div>
          <dt>Recommender package</dt>
          <dd>{RECOMMENDER_PACKAGE_STATUS}</dd>
        </div>
      </dl>
    </main>
  );
}

export default App;
