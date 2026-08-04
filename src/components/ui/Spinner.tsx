import { Loader2 } from 'lucide-react';

export function Spinner({ className = '', size }: { className?: string; size?: number }) {
  return <Loader2 className={`animate-spin ${className}`} size={size} />;
}

export function LoadingScreen({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/30" />
        <div className="relative h-14 w-14 rounded-2xl overflow-hidden">
          <img src="/image copy.png" alt="TrainX" className="w-full h-full object-cover" />
        </div>
      </div>
      <p className="text-ink-300 text-sm">{label}</p>
    </div>
  );
}
