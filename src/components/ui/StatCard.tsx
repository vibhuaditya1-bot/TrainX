import { type LucideIcon } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  accent = 'brand',
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  accent?: 'brand' | 'lime' | 'coral' | 'neutral';
  trend?: { value: string; positive: boolean };
}) {
  const accents = {
    brand: 'from-brand-500/20 to-brand-700/5 text-brand-400',
    lime: 'from-lime-500/20 to-lime-600/5 text-lime-400',
    coral: 'from-coral-500/20 to-coral-400/5 text-coral-400',
    neutral: 'from-ink-600/30 to-ink-700/5 text-ink-200',
  };

  return (
    <div className="stat-card card-hover relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} blur-xl opacity-60`} />
      <div className="flex items-center justify-between relative">
        <span className="text-xs font-medium text-ink-300 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${accents[accent]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-2 relative">
        <span className="font-display text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-ink-300">{unit}</span>}
      </div>
      {trend && (
        <span className={`text-xs font-medium mt-1 ${trend.positive ? 'text-lime-400' : 'text-coral-400'}`}>
          {trend.value}
        </span>
      )}
    </div>
  );
}
