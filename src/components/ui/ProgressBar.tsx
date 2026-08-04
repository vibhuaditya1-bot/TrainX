export function ProgressBar({
  value,
  max = 100,
  className = '',
  color = 'brand',
}: {
  value: number;
  max?: number;
  className?: string;
  color?: 'brand' | 'lime' | 'coral';
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    brand: 'from-brand-500 to-brand-400',
    lime: 'from-lime-500 to-lime-400',
    coral: 'from-coral-500 to-coral-400',
  };
  return (
    <div className={`h-2 rounded-full bg-ink-700 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colors[color]} transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
