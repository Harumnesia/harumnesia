type Choice = { value: string; label: string };

export function ChoiceGroup({
  legend,
  choices,
  selected,
  onChange,
}: {
  legend: string;
  choices: readonly (string | Choice)[];
  selected: readonly string[];
  onChange(values: string[]): void;
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
      </div>
    </fieldset>
  );
}
