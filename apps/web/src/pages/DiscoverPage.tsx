import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChoiceGroup } from '../components/discovery/ChoiceGroup.js';
import { TagSelector } from '../components/discovery/TagSelector.js';
import { PageTitle } from '../components/PageTitle.js';
import { validateDiscoveryForm } from '../features/recommendation/form.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';
import {
  INITIAL_DISCOVERY_FORM,
  type DiscoveryFormState,
  type MarketChoice,
} from '../features/recommendation/types.js';
import {
  ACCORD_OPTIONS,
  CONCENTRATION_OPTIONS,
  GENDER_OPTIONS,
  NOTE_OPTIONS,
  OCCASION_OPTIONS,
} from '../fixtures/taxonomy.js';

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

export function DiscoverPage() {
  const navigate = useNavigate();
  const { status, error, submit, lastForm } = useRecommendationExperience();
  const [form, setForm] = useState<DiscoveryFormState>(() =>
    lastForm === INITIAL_DISCOVERY_FORM ? cloneInitialForm() : lastForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <>
      <PageTitle title="Discover your fragrance" />
      <section className="page-intro section-shell section-shell--narrow">
        <p className="eyebrow">Your scent profile</p>
        <h1>What would you like to feel in a fragrance?</h1>
        <p className="lede">
          Begin with preferences—they guide the ranking without ruling scents
          out. Use advanced filters only for firm boundaries.
        </p>
      </section>

      <form
        className="discovery-form section-shell section-shell--narrow"
        onSubmit={handleSubmit}
      >
        <section className="form-section" aria-labelledby="preferences-heading">
          <div className="form-section__heading">
            <span>01</span>
            <div>
              <h2 id="preferences-heading">What draws you in?</h2>
              <p>
                These are preferences, so nearby discoveries can still appear.
              </p>
            </div>
          </div>
          <TagSelector
            hint="Try a material you already love, such as bergamot or sandalwood."
            label="Preferred notes"
            onChange={(values) => update('preferredNotes', values)}
            options={NOTE_OPTIONS}
            selected={form.preferredNotes}
          />
          <TagSelector
            hint="Accords describe an overall impression, such as fresh or woody."
            label="Preferred accords"
            onChange={(values) => update('preferredAccords', values)}
            options={ACCORD_OPTIONS}
            selected={form.preferredAccords}
          />
        </section>

        <section className="form-section" aria-labelledby="context-heading">
          <div className="form-section__heading">
            <span>02</span>
            <div>
              <h2 id="context-heading">Give it some context.</h2>
              <p>All choices are optional. Pick as many as feel useful.</p>
            </div>
          </div>
          <ChoiceGroup
            choices={GENDER_OPTIONS}
            legend="Preferred expression"
            onChange={(values) =>
              update(
                'preferredGenders',
                values as DiscoveryFormState['preferredGenders'],
              )
            }
            selected={form.preferredGenders}
          />
          <ChoiceGroup
            choices={OCCASION_OPTIONS}
            legend="Preferred occasion"
            onChange={(values) => update('preferredOccasions', values)}
            selected={form.preferredOccasions}
          />
          <ChoiceGroup
            choices={CONCENTRATION_OPTIONS}
            legend="Preferred concentration"
            onChange={(values) => update('preferredConcentrations', values)}
            selected={form.preferredConcentrations}
          />
        </section>

        <details className="advanced-filters">
          <summary>
            <span>Advanced filters</span>
            <small>Set firm boundaries</small>
          </summary>
          <div className="advanced-filters__body">
            <fieldset className="choice-group">
              <legend>Market</legend>
              <div className="choice-row">
                {(
                  [
                    ['all', 'All markets'],
                    ['local', 'Local'],
                    ['international', 'International'],
                  ] as const
                ).map(([value, label]) => (
                  <label className="choice" key={value}>
                    <input
                      checked={form.market === value}
                      name="market"
                      onChange={() => update('market', value as MarketChoice)}
                      type="radio"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="budget-field">
              <label htmlFor="max-budget">Maximum budget (IDR)</label>
              <p className="field-hint">
                Budget filtering applies where price information is available.
                Leave blank if price is not a firm limit.
              </p>
              <input
                aria-describedby={
                  errors.maxBudget ? 'max-budget-error' : undefined
                }
                aria-invalid={Boolean(errors.maxBudget)}
                id="max-budget"
                inputMode="numeric"
                min="1"
                onChange={(event) => update('maxBudget', event.target.value)}
                placeholder="e.g. 500000"
                step="1"
                type="number"
                value={form.maxBudget}
              />
              {errors.maxBudget ? (
                <p className="field-error" id="max-budget-error" role="alert">
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
            </div>

            <ChoiceGroup
              choices={GENDER_OPTIONS}
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
              choices={OCCASION_OPTIONS}
              legend="Only these occasions"
              onChange={(values) => update('strictOccasions', values)}
              selected={form.strictOccasions}
            />
            <ChoiceGroup
              choices={CONCENTRATION_OPTIONS}
              legend="Only these concentrations"
              onChange={(values) => update('strictConcentrations', values)}
              selected={form.strictConcentrations}
            />
            <TagSelector
              hint="Any fragrance containing these notes will be excluded."
              label="Excluded notes"
              onChange={(values) => update('excludedNotes', values)}
              options={NOTE_OPTIONS}
              selected={form.excludedNotes}
            />
          </div>
        </details>

        {error ? (
          <p className="form-status" role="alert">
            {error}
          </p>
        ) : null}
        <div className="submit-row">
          <p>Your choices stay in this browser preview.</p>
          <button
            className="button"
            disabled={status === 'submitting'}
            type="submit"
          >
            {status === 'submitting'
              ? 'Preparing your edit…'
              : 'Show my recommendations'}
          </button>
        </div>
      </form>
    </>
  );
}
