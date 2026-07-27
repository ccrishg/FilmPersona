/**
 * Apple-style segmented control: a sliding "thumb" moves under the active
 * option instead of the buttons changing background individually.
 */
export function ToggleGroup<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="relative grid rounded-full bg-night p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-night-soft transition-transform duration-300"
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${index * 100}%)`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? "relative z-10 min-w-[4.5rem] rounded-full px-3 py-1 text-xs font-semibold text-lime transition-colors"
              : "relative z-10 min-w-[4.5rem] rounded-full px-3 py-1 text-xs text-fog transition-colors hover:text-snow"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
