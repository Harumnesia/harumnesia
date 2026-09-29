import { useId, useState } from 'react';

export function TagSelector({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string;
  hint: string;
  options: readonly string[];
  selected: readonly string[];
  onChange(values: string[]): void;
}) {
  const inputId = useId();
  const hintId = useId();
  const [query, setQuery] = useState('');
  const available = options.filter(
    (option) =>
      !selected.includes(option) &&
      option
        .toLocaleLowerCase('en-US')
        .includes(query.toLocaleLowerCase('en-US')),
  );

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
          if (event.key === 'Enter' && available[0]) {
            event.preventDefault();
            add(available[0]);
          }
        }}
        placeholder="Type to filter, then press Enter"
        value={query}
      />
      {available.length > 0 ? (
        <div className="option-list" aria-label={`${label} options`}>
          {available.map((option) => (
            <button key={option} onClick={() => add(option)} type="button">
              + {option}
            </button>
          ))}
        </div>
      ) : (
        <p className="field-hint">No matching options.</p>
      )}
    </div>
  );
}
