import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { SiteLayout } from './components/layout/SiteLayout.js';
import { RecommendationExperienceProvider } from './features/recommendation/RecommendationExperience.js';
import type {
  DiscoveryTaxonomyLoader,
  RecommendationService,
} from './features/recommendation/types.js';
import { DiscoverPage } from './pages/DiscoverPage.js';
import { LandingPage } from './pages/LandingPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { PerfumeDetailPage } from './pages/PerfumeDetailPage.js';
import { ResultsPage } from './pages/ResultsPage.js';

export function AppRoutes({
  service,
  taxonomyLoader,
}: {
  service?: RecommendationService;
  taxonomyLoader?: DiscoveryTaxonomyLoader;
}) {
  return (
    <RecommendationExperienceProvider {...(service ? { service } : {})}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<LandingPage />} />
          <Route
            path="discover"
            element={
              <DiscoverPage
                {...(taxonomyLoader ? { loadTaxonomy: taxonomyLoader } : {})}
              />
            }
          />
          <Route path="results" element={<ResultsPage />} />
          <Route path="perfume/:id" element={<PerfumeDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </RecommendationExperienceProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
