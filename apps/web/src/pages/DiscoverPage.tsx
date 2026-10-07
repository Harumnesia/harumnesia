import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChoiceGroup } from '../components/discovery/ChoiceGroup.js';
import { TagSelector } from '../components/discovery/TagSelector.js';
import { PageTitle } from '../components/PageTitle.js';
import { DatasetStat } from '../components/editorial/DatasetStat.js';
import { EditorialArtwork } from '../components/editorial/EditorialArtwork.js';
import { EditorialIcon } from '../components/editorial/EditorialIcon.js';
import { ProfileSummary } from '../components/editorial/ProfileSummary.js';
import { SystemState } from '../components/SystemState.js';
import { validateDiscoveryForm } from '../features/recommendation/form.js';
import { loadProductionTaxonomy } from '../features/recommendation/taxonomy.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';
import {
  INITIAL_DISCOVERY_FORM,
  type DiscoveryFormState,
  type DiscoveryTaxonomy,
  type DiscoveryTaxonomyLoader,
  type MarketChoice,
} from '../features/recommendation/types.js';

type TaxonomyState =
  | { status: 'loading' }
  | { status: 'success'; taxonomy: DiscoveryTaxonomy }
  | { status: 'error' };

function cloneInitialForm(): DiscoveryFormState {
  return {
    ...INITIAL_DISCOVERY_FORM,
    preferredNotes: [],
    preferredAccords: [],
    preferredGenders: [],
    preferredOccasions: [],
    preferredConcentrations: [],
    strictGenders: [],
    strictOccasions: [],
    strictConcentrations: [],
    excludedNotes: [],
  };
}

export function DiscoverPage({
  loadTaxonomy = loadProductionTaxonomy,
}: {
  loadTaxonomy?: DiscoveryTaxonomyLoader;
}) {
  const navigate = useNavigate();
  const { status, error, submit, lastForm } = useRecommendationExperience();
  const [form, setForm] = useState<DiscoveryFormState>(() =>
    lastForm === INITIAL_DISCOVERY_FORM ? cloneInitialForm() : lastForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetVersion, setResetVersion] = useState(0);
  const [taxonomyRetry, setTaxonomyRetry] = useState(0);
  const [taxonomyState, setTaxonomyState] = useState<TaxonomyState>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    void loadTaxonomy()
      .then((taxonomy) => {
        if (!cancelled) setTaxonomyState({ status: 'success', taxonomy });
      })
      .catch(() => {
        if (!cancelled) setTaxonomyState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [loadTaxonomy, taxonomyRetry]);

  function update<K extends keyof DiscoveryFormState>(
    key: K,
    value: DiscoveryFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDiscoveryForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (await submit(form)) navigate('/results');
  }

  function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForm(cloneInitialForm());
    setErrors({});
    setResetVersion((version) => version + 1);
  }

  if (taxonomyState.status === 'loading') {
    return (
      <SystemState
        title="Loading discovery"
        eyebrow="Preparing discovery"
        heading="Loading fragrance vocabulary…"
        description="Gathering the notes and accords you can explore."
        descriptionRole="status"
        loading
      />
    );
  }

  if (taxonomyState.status === 'error') {
    return (
      <SystemState
        title="Unable to load discovery"
        eyebrow="Discovery was interrupted"
        heading="We could not load the fragrance vocabulary."
        description="Please try again before choosing your preferences."
        descriptionRole="alert"
        tone="error"
      >
        <button
          className="button"
          onClick={() => {
            setTaxonomyState({ status: 'loading' });
            setTaxonomyRetry((retry) => retry + 1);
          }}
          type="button"
        >
          Try again
        </button>
      </SystemState>
    );
  }

  const { taxonomy } = taxonomyState;

  return (
    <>
      <PageTitle title="Discover your fragrance" />
      <div className="discovery-layout section-shell">
        <section className="editorial-intro discovery-intro">
          <p className="folio-label">Discover your scent</p>
          <h1>
            Build your fragrance <em>profile.</em>
          </h1>
          <p className="lede">
            Begin with the notes, accords, and occasions you enjoy. Your
            preferences guide the edit; market, budget, and advanced filters set
            its boundaries.
          </p>
        </section>

        <form
          className="discovery-form"
          id="discovery-form"
          onSubmit={handleSubmit}
          onReset={handleReset}
        >
          <div
            className="discovery-fields"
            id="profile-preferences"
            tabIndex={-1}
          >
            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Notes</h2>
                <p>Choose the materials you love, or are curious about.</p>
              </div>
              <TagSelector
                compact
                key={`notes-${resetVersion}`}
                hint="Try a material you already love, such as bergamot or sandalwood."
                label="Preferred notes"
                onChange={(values) => update('preferredNotes', values)}
                options={taxonomy.notes}
                selected={form.preferredNotes}
                suggestions={[
                  'vanilla',
                  'bergamot',
                  'jasmine',
                  'rose',
                  'iris',
                  'sandalwood',
                  'cedar',
                  'patchouli',
                  'musk',
                ]}
              />
            </div>
            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Accords</h2>
                <p>The overall impressions that match your taste.</p>
              </div>
              <TagSelector
                compact
                key={`accords-${resetVersion}`}
                hint="Accords describe an overall impression, such as fresh or woody."
                label="Preferred accords"
                onChange={(values) => update('preferredAccords', values)}
                options={taxonomy.accords}
                selected={form.preferredAccords}
                suggestions={[
                  'amber',
                  'woody',
                  'citrus',
                  'floral',
                  'powdery',
                  'fresh spicy',
                  'green',
                  'sweet',
                  'aromatic',
                ]}
              />
            </div>

            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Gender</h2>
                <p>Choose a preference, or keep it open.</p>
              </div>
              <ChoiceGroup
                allowAny
                choices={[...taxonomy.genders].sort(
                  (a, b) =>
                    Number(b.value === 'unisex') - Number(a.value === 'unisex'),
                )}
                legend="Preferred expression"
                onChange={(values) =>
                  update(
                    'preferredGenders',
                    values as DiscoveryFormState['preferredGenders'],
                  )
                }
                selected={form.preferredGenders}
              />
            </div>
            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Occasion</h2>
                <p>When would you like to wear it?</p>
              </div>
              <ChoiceGroup
                choices={taxonomy.occasions}
                legend="Preferred occasion"
                onChange={(values) => update('preferredOccasions', values)}
                selected={form.preferredOccasions}
              />
            </div>
            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Concentration</h2>
                <p>Choose your preferred concentration.</p>
              </div>
              <ChoiceGroup
                allowAny
                choices={[...taxonomy.concentrations].sort(
                  (a, b) => Number(b === 'EDT') - Number(a === 'EDT'),
                )}
                legend="Preferred concentration"
                onChange={(values) => update('preferredConcentrations', values)}
                selected={form.preferredConcentrations}
              />
            </div>

            <div className="filter-row">
              <div className="filter-row__heading">
                <h2>Market & budget</h2>
                <p>Where should we look, and what is your limit?</p>
              </div>
              <div className="market-budget">
                <fieldset className="choice-group">
                  <legend>Market</legend>
                  <div className="choice-row">
                    {(
                      [
                        ['local', 'Local'],
                        ['international', 'International'],
                        ['all', 'Both'],
                      ] as const
                    ).map(([value, label]) => (
                      <label className="choice" key={value}>
                        <input
                          checked={form.market === value}
                          name="market"
                          onChange={() =>
                            update('market', value as MarketChoice)
                          }
                          type="radio"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="budget-field">
                  <label htmlFor="max-budget">Maximum budget (IDR)</label>
                  <input
                    aria-describedby={
                      errors.maxBudget ? 'max-budget-error' : undefined
                    }
                    aria-invalid={Boolean(errors.maxBudget)}
                    id="max-budget"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) =>
                      update('maxBudget', event.target.value)
                    }
                    placeholder="e.g. 500000"
                    step="1"
                    type="number"
                    value={form.maxBudget}
                  />
                  {errors.maxBudget ? (
                    <p
                      className="field-error"
                      id="max-budget-error"
                      role="alert"
                    >
                      {errors.maxBudget}
                    </p>
                  ) : null}
                  <div className="preset-row" aria-label="Budget presets">
                    {[250_000, 500_000, 1_000_000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => update('maxBudget', String(amount))}
                        type="button"
                      >
                        {new Intl.NumberFormat('id-ID').format(amount)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <details className="advanced-filters">
              <summary>
                <span>Advanced options</span>
                <small>Exclude notes and set firm boundaries</small>
              </summary>
              <div className="advanced-filters__body">
                <div className="price-policy">
                  <label className="check-line">
                    <input
                      checked={form.includeUnpriced}
                      onChange={(event) =>
                        update('includeUnpriced', event.target.checked)
                      }
                      type="checkbox"
                    />
                    Include fragrances whose price is not listed
                  </label>
                  <p className="field-hint">
                    Budget filtering applies where price information is
                    available. Leave the maximum budget blank if price is not a
                    firm limit.
                  </p>
                </div>
                <ChoiceGroup
                  choices={taxonomy.genders}
                  legend="Only these expressions"
                  onChange={(values) =>
                    update(
                      'strictGenders',
                      values as DiscoveryFormState['strictGenders'],
                    )
                  }
                  selected={form.strictGenders}
                />
                <ChoiceGroup
                  choices={taxonomy.occasions}
                  legend="Only these occasions"
                  onChange={(values) => update('strictOccasions', values)}
                  selected={form.strictOccasions}
                />
                <ChoiceGroup
                  choices={taxonomy.concentrations}
                  legend="Only these concentrations"
                  onChange={(values) => update('strictConcentrations', values)}
                  selected={form.strictConcentrations}
                />
                <TagSelector
                  key={`exclusions-${resetVersion}`}
                  hint="Any fragrance containing these notes will be excluded."
                  label="Excluded notes"
                  onChange={(values) => update('excludedNotes', values)}
                  options={taxonomy.notes}
                  selected={form.excludedNotes}
                />
              </div>
            </details>
          </div>
          <aside
            className="editorial-rail discovery-rail"
            aria-label="Your discovery profile"
          >
            <EditorialArtwork />
            <ProfileSummary form={form} editing />
            <DatasetStat />
            <p className="editorial-statement">
              A more personal way to discover fragrance.
            </p>
          </aside>
          <div className="discovery-end">
            {error ? (
              <div className="form-status" role="alert">
                <span className="eyebrow">Consultation interrupted</span>
                <p>{error}</p>
              </div>
            ) : null}
            <div className="discovery-actions">
              <div className="submit-row__action">
                {status === 'submitting' ? (
                  <span className="submit-row__activity" role="status">
                    Preparing your fragrance recommendations…
                  </span>
                ) : null}
                <button
                  className="button"
                  disabled={status === 'submitting'}
                  type="submit"
                >
                  {status === 'submitting'
                    ? 'Preparing your fragrance recommendations…'
                    : 'Show my recommendations'}
                  {status !== 'submitting' ? (
                    <EditorialIcon name="arrow" />
                  ) : null}
                </button>
                <button
                  className="button button--outline"
                  disabled={status === 'submitting'}
                  type="reset"
                >
                  Reset filters
                </button>
              </div>
              <p>Your choices are processed in this browser session.</p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
