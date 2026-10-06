import { useId, useMemo, useState } from 'react';

export const MAX_VISIBLE_OPTIONS = 10;

export function TagSelector({
  label,
  hint,
  options,
  selected,
  onChange,
  suggestions = [],
}: {
  label: string;
  hint: string;
  options: readonly string[];
  selected: readonly string[];
  onChange(values: string[]): void;
  suggestions?: readonly string[];
}) {
  const inputId = useId();
  const hintId = useId();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    const matching = options.filter(
      (option) =>
        !selected.includes(option) &&
        option.toLocaleLowerCase('en-US').includes(normalizedQuery),
    );
    const exact = matching.find(
      (option) => option.toLocaleLowerCase('en-US') === normalizedQuery,
    );
    return exact
      ? [exact, ...matching.filter((option) => option !== exact)]
      : matching;
  }, [normalizedQuery, options, selected]);
  const visibleOptions = matches.slice(0, MAX_VISIBLE_OPTIONS);

  function add(value: string) {
    if (!selected.includes(value)) onChange([...selected, value]);
    setQuery('');
  }

  return (
    <div className="tag-selector">
      <label htmlFor={inputId}>{label}</label>
      <p className="field-hint" id={hintId}>
        {hint}
      </p>
      {suggestions.length > 0 ? (
        <div className="scent-options" aria-label={`Suggested ${label}`}>
          {suggestions
            .filter((value) => options.includes(value))
            .map((value) => (
              <button
                aria-pressed={selected.includes(value)}
                key={value}
                onClick={() =>
                  selected.includes(value)
                    ? onChange(selected.filter((item) => item !== value))
                    : add(value)
                }
                type="button"
              >
                <span aria-hidden="true" className="scent-options__mark" />
                {value}
              </button>
            ))}
        </div>
      ) : null}
      {selected.length > 0 ? (
        <ul className="selected-tags" aria-label={`Selected ${label}`}>
          {selected.map((value) => (
            <li key={value}>
              <span>{value}</span>
              <button
                aria-label={`Remove ${value}`}
                onClick={() =>
                  onChange(selected.filter((item) => item !== value))
                }
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        aria-describedby={hintId}
        autoComplete="off"
        id={inputId}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && visibleOptions[0]) {
            event.preventDefault();
            add(visibleOptions[0]);
          }
        }}
        placeholder="Type to filter, then press Enter"
        value={query}
      />
      {visibleOptions.length > 0 ? (
        <div className="option-list" aria-label={`${label} options`}>
          {visibleOptions.map((option) => (
            <button key={option} onClick={() => add(option)} type="button">
              + {option}
            </button>
          ))}
        </div>
      ) : normalizedQuery ? (
        <p className="field-hint">No matching options.</p>
      ) : null}
      {matches.length > MAX_VISIBLE_OPTIONS ? (
        <p className="field-hint">
          Showing the first {MAX_VISIBLE_OPTIONS} matches. Keep typing to narrow
          the list.
        </p>
      ) : null}
    </div>
  );
}
