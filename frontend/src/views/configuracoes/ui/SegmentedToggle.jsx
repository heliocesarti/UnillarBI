export default function SegmentedToggle({ value, options, onChange }) {
  return (
    <div className="segmented-toggle">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={'segmented-toggle-opt' + (value === opt.value ? ' active' : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
