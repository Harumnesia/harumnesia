type Choice = { value: string; label: string };

export function ChoiceGroup({
  legend,
  choices,
  selected,
  onChange,
  allowAny = false,
}: {
  legend: string;
  choices: readonly (string | Choice)[];
  selected: readonly string[];
  onChange(values: string[]): void;
  allowAny?: boolean;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-row">
        {choices.map((choice) => {
          const value = typeof choice === 'string' ? choice : choice.value;
          const label = typeof choice === 'string' ? choice : choice.label;
          return (
            <label className="choice" key={value}>
              <input
                checked={selected.includes(value)}
                onChange={() => toggle(value)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          );
        })}
        {allowAny ? (
          <label className="choice">
            <input
              checked={selected.length === 0}
              onChange={() => onChange([])}
              type="checkbox"
            />
            <span>Any</span>
          </label>
        ) : null}
      </div>
    </fieldset>
  );
}
