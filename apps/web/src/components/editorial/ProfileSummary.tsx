import { Link } from 'react-router-dom';
import { useId } from 'react';

import type { DiscoveryFormState } from '../../features/recommendation/types.js';
import { EditorialIcon, type EditorialIconName } from './EditorialIcon.js';

export function PreferenceSummary({ form }: { form: DiscoveryFormState }) {
  const groups: Array<[string, readonly string[], EditorialIconName]> = [
    ['Notes', form.preferredNotes, 'note'],
    ['Accords', form.preferredAccords, 'leaf'],
    ['Expression', form.preferredGenders, 'leaf'],
    ['Occasion', form.preferredOccasions, 'moon'],
    ['Concentration', form.preferredConcentrations, 'bottle'],
    ['Only expressions', form.strictGenders, 'leaf'],
    ['Only occasions', form.strictOccasions, 'moon'],
    ['Only concentrations', form.strictConcentrations, 'bottle'],
    ['Excluded notes', form.excludedNotes, 'note'],
  ];
  const hasPreferences = groups.some(([, values]) => values.length > 0);
  const budget = Number(form.maxBudget);
  const hasBudget = Number.isInteger(budget) && budget > 0;

  return (
    <>
      {!hasPreferences ? (
        <p className="profile-summary__empty">
          An open beginning. Add a note or accord to make this edit more
          personal.
        </p>
      ) : null}
      <ul className="preference-chips" aria-label="Your selected preferences">
        {groups.flatMap(([label, values, icon]) =>
          values.map((value) => (
            <li key={`${label}:${value}`}>
              <EditorialIcon name={icon} />
              <span>
                {!label.startsWith('Only') && label !== 'Excluded notes' ? (
                  <span className="sr-only">{label}: </span>
                ) : null}
                {label.startsWith('Only') || label === 'Excluded notes'
                  ? `${label}: ${value}`
                  : value}
              </span>
            </li>
          )),
        )}
        <li>
          <EditorialIcon name="globe" />
          <span>
            <span className="sr-only">Market: </span>
            {form.market === 'all' ? 'Local + International' : form.market}
          </span>
        </li>
        {hasBudget ? (
          <li>
            <EditorialIcon name="layers" />
            <span>
              Up to Rp {new Intl.NumberFormat('id-ID').format(budget)}
            </span>
          </li>
        ) : null}
      </ul>
      {hasBudget ? (
        <p className="profile-summary__policy">
          {form.includeUnpriced
            ? 'Fragrances without a listed price are included.'
            : 'Fragrances without a listed price are excluded.'}
        </p>
      ) : null}
    </>
  );
}

export function ProfileSummary({
  form,
  editing = false,
  title = 'Your scent profile',
}: {
  form: DiscoveryFormState;
  editing?: boolean;
  title?: string;
}) {
  const titleId = useId();
  return (
    <section className="profile-summary" aria-labelledby={titleId}>
      <div className="profile-summary__heading">
        <h2 id={titleId}>{title}</h2>
        {editing ? (
          <a className="text-link" href="#profile-preferences">
            <EditorialIcon name="edit" /> Edit selections
          </a>
        ) : (
          <Link className="text-link" to="/discover">
            <EditorialIcon name="edit" /> Edit preferences
          </Link>
        )}
      </div>
      <p>A summary of your current preferences.</p>
      <PreferenceSummary form={form} />
    </section>
  );
}
