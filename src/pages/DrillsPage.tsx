import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { SPORTS, type Drill, type Sport } from '@/types';
import { Search, Clock, Flame, Dumbbell, Play, Filter, ChevronRight, ExternalLink } from 'lucide-react';

export function DrillsPage() {
  const { profile } = useAuth();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Drill | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('drills').select('*').order('sport').order('title');
      setDrills((data as Drill[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Default filter to user's sport
  useEffect(() => {
    if (profile && sportFilter === 'all') setSportFilter(profile.sport);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return drills.filter((d) => {
      if (sportFilter !== 'all' && d.sport !== sportFilter) return false;
      if (difficultyFilter !== 'all' && d.difficulty !== difficultyFilter) return false;
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [drills, sportFilter, difficultyFilter, search]);

  if (loading) return <div className="text-ink-300">Loading drills...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Drill Library</h1>
        <p className="text-ink-300 text-sm mt-1">Sport-specific drills with coaching videos — home & park friendly</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search drills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSportFilter('all')}
            className={`chip border transition-all ${sportFilter === 'all' ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-ink-800/50 border-ink-700 text-ink-300'}`}
          >
            All Sports
          </button>
          {SPORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSportFilter(s.value)}
              className={`chip border transition-all capitalize ${sportFilter === s.value ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-ink-800/50 border-ink-700 text-ink-300 hover:border-ink-600'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-400" />
          {['all', 'beginner', 'intermediate', 'advanced'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d)}
              className={`chip capitalize text-xs ${difficultyFilter === d ? 'bg-lime-500/20 text-lime-400' : 'bg-ink-800/50 text-ink-400'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Drills grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Dumbbell size={36} className="mx-auto text-ink-500 mb-3" />
          <p className="text-ink-300">No drills match your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((drill) => (
            <button
              key={drill.id}
              onClick={() => setSelected(drill)}
              className="card card-hover p-5 text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="chip bg-ink-700/50 text-ink-300 capitalize text-xs">{drill.sport.replace('_', ' ')}</span>
                <span className={`chip text-xs ${drill.difficulty === 'beginner' ? 'bg-lime-500/10 text-lime-400' : drill.difficulty === 'intermediate' ? 'bg-brand-500/10 text-brand-400' : 'bg-coral-500/10 text-coral-400'}`}>
                  {drill.difficulty}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1">{drill.title}</h3>
              <p className="text-sm text-ink-300 line-clamp-2 mb-3">{drill.description}</p>
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <span className="flex items-center gap-1"><Clock size={12} /> {drill.duration_minutes} min</span>
                <span className="flex items-center gap-1"><Flame size={12} /> {drill.calories_per_min * drill.duration_minutes} kcal</span>
                {drill.youtube_id && <span className="flex items-center gap-1 text-brand-400"><Play size={12} /> Video</span>}
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drill detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-ink-700/50 text-ink-300 capitalize">{selected.sport.replace('_', ' ')}</span>
              <span className="chip bg-ink-700/50 text-ink-300">{selected.category}</span>
              <span className={`chip ${selected.difficulty === 'beginner' ? 'bg-lime-500/10 text-lime-400' : selected.difficulty === 'intermediate' ? 'bg-brand-500/10 text-brand-400' : 'bg-coral-500/10 text-coral-400'}`}>
                {selected.difficulty}
              </span>
              <span className="chip bg-ink-700/50 text-ink-300"><Clock size={12} /> {selected.duration_minutes} min</span>
            </div>

            <p className="text-ink-200">{selected.description}</p>

            {/* YouTube video — opens in new tab (iframe blocked in preview environments) */}
            {selected.youtube_id && (
              <a
                href={`https://www.youtube.com/watch?v=${selected.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative rounded-xl overflow-hidden border border-ink-700/60 bg-ink-900 aspect-video"
              >
                <img
                  src={`https://img.youtube.com/vi/${selected.youtube_id}/hqdefault.jpg`}
                  alt={`${selected.title} coaching video`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-ink-950/40 group-hover:bg-ink-950/20 transition-colors" />
                {/* Play button */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-brand-500 flex items-center justify-center shadow-xl shadow-brand-500/40 group-hover:scale-110 transition-transform">
                    <Play size={28} className="text-ink-950 ml-1" fill="currentColor" />
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white bg-ink-900/70 px-3 py-1.5 rounded-full">
                    Watch Coaching Video on YouTube
                    <ExternalLink size={13} />
                  </span>
                </div>
              </a>
            )}

            {/* Instructions */}
            <div>
              <h4 className="font-display font-bold text-white mb-2">Step-by-Step Instructions</h4>
              <ol className="space-y-2">
                {selected.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm text-ink-200 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            {selected.tips.length > 0 && (
              <div className="p-4 rounded-xl bg-lime-500/5 border border-lime-500/20">
                <h4 className="font-display font-bold text-lime-400 mb-2 text-sm">Pro Tips</h4>
                <ul className="space-y-1.5">
                  {selected.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-ink-200 flex gap-2">
                      <span className="text-lime-400">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Equipment + muscles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-ink-800/50">
                <p className="text-xs text-ink-400 mb-1">Equipment</p>
                <p className="text-sm text-white">{selected.equipment.length ? selected.equipment.join(', ') : 'None'}</p>
              </div>
              <div className="p-3 rounded-xl bg-ink-800/50">
                <p className="text-xs text-ink-400 mb-1">Muscle Groups</p>
                <p className="text-sm text-white capitalize">{selected.muscle_groups.join(', ')}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
