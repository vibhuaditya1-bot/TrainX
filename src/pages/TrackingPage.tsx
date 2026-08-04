import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Footprints, Droplets, Moon, Flame, Heart, Scale, Plus, TrendingUp, Activity, Save } from 'lucide-react';
import type { DailyMetric } from '@/types';

export function TrackingPage() {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [steps, setSteps] = useState('');
  const [calConsumed, setCalConsumed] = useState('');
  const [calBurned, setCalBurned] = useState('');
  const [sleep, setSleep] = useState('');
  const [hydration, setHydration] = useState('');
  const [recovery, setRecovery] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('daily_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(30);
      const m = (data as DailyMetric[]) ?? [];
      setMetrics(m);
      // Pre-fill today's data if exists
      const todayM = m.find((x) => x.metric_date === today);
      if (todayM) {
        setWeight(todayM.weight_kg?.toString() ?? '');
        setSteps(todayM.steps?.toString() ?? '');
        setCalConsumed(todayM.calories_consumed?.toString() ?? '');
        setCalBurned(todayM.calories_burned?.toString() ?? '');
        setSleep(todayM.sleep_hours?.toString() ?? '');
        setHydration(todayM.hydration_ml?.toString() ?? '');
        setRecovery(todayM.recovery_score?.toString() ?? '');
        setRestingHr(todayM.resting_hr?.toString() ?? '');
        setNotes(todayM.notes ?? '');
      }
      setLoading(false);
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      metric_date: date,
      weight_kg: weight ? Number(weight) : null,
      steps: steps ? Number(steps) : null,
      calories_consumed: calConsumed ? Number(calConsumed) : null,
      calories_burned: calBurned ? Number(calBurned) : null,
      sleep_hours: sleep ? Number(sleep) : null,
      hydration_ml: hydration ? Number(hydration) : null,
      recovery_score: recovery ? Number(recovery) : null,
      resting_hr: restingHr ? Number(restingHr) : null,
      notes: notes.trim() || null,
    };

    // Upsert (unique on user_id + metric_date)
    const { data } = await supabase.from('daily_metrics').upsert(payload, { onConflict: 'user_id,metric_date' }).select('*').single();
    if (data) {
      setMetrics((prev) => {
        const exists = prev.find((m) => m.metric_date === date);
        if (exists) return prev.map((m) => m.metric_date === date ? data as DailyMetric : m);
        return [data as DailyMetric, ...prev];
      });
    }
    setSaving(false);
    setShowLog(false);
  };

  const todayMetric = metrics.find((m) => m.metric_date === today);
  const weekMetrics = metrics.slice(0, 7).reverse();

  // Trend calculations
  const avgSteps = weekMetrics.length ? Math.round(weekMetrics.reduce((s, m) => s + (m.steps ?? 0), 0) / weekMetrics.length) : 0;
  const avgSleep = weekMetrics.length ? (weekMetrics.reduce((s, m) => s + (m.sleep_hours ?? 0), 0) / weekMetrics.length).toFixed(1) : '0';
  const avgHydration = weekMetrics.length ? Math.round(weekMetrics.reduce((s, m) => s + (m.hydration_ml ?? 0), 0) / weekMetrics.length) : 0;
  const weightTrend = weekMetrics.filter((m) => m.weight_kg).map((m) => m.weight_kg!);

  if (loading) return <div className="text-ink-300">Loading metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Fitness Tracking</h1>
          <p className="text-ink-300 text-sm mt-1">Monitor your daily health and recovery metrics</p>
        </div>
        <button onClick={() => setShowLog(true)} className="btn-primary text-sm">
          <Plus size={16} />
          Log Metrics
        </button>
      </div>

      {/* BMI card */}
      {profile?.bmi && (
        <div className="card p-6 bg-gradient-to-r from-brand-500/10 to-transparent border-brand-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-500/20">
                <Scale size={24} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-ink-300">Your BMI</p>
                <p className="font-display text-3xl font-bold text-white">{profile.bmi}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-300">Category</p>
              <p className={`font-display text-lg font-bold ${profile.bmi < 18.5 ? 'text-brand-400' : profile.bmi < 25 ? 'text-lime-400' : profile.bmi < 30 ? 'text-coral-400' : 'text-coral-500'}`}>
                {profile.bmi < 18.5 ? 'Underweight' : profile.bmi < 25 ? 'Healthy' : profile.bmi < 30 ? 'Overweight' : 'Obese'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Footprints} label="Steps Today" value={todayMetric?.steps?.toLocaleString() ?? '—'} accent="brand" />
        <StatCard icon={Flame} label="Calories Burned" value={todayMetric?.calories_burned ?? '—'} unit="kcal" accent="coral" />
        <StatCard icon={Droplets} label="Hydration" value={todayMetric?.hydration_ml ? `${(todayMetric.hydration_ml / 1000).toFixed(1)}L` : '—'} accent="brand" />
        <StatCard icon={Moon} label="Sleep" value={todayMetric?.sleep_hours ? `${todayMetric.sleep_hours}h` : '—'} accent="lime" />
      </div>

      {/* Weekly averages */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-400" />
          7-Day Averages
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-ink-400 mb-1">Avg Steps</p>
            <p className="font-display text-xl font-bold text-white">{avgSteps.toLocaleString()}</p>
            <ProgressBar value={avgSteps} max={10000} className="mt-2" />
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Avg Sleep</p>
            <p className="font-display text-xl font-bold text-white">{avgSleep}h</p>
            <ProgressBar value={Number(avgSleep)} max={8} color="lime" className="mt-2" />
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Avg Hydration</p>
            <p className="font-display text-xl font-bold text-white">{(avgHydration / 1000).toFixed(1)}L</p>
            <ProgressBar value={avgHydration} max={2500} className="mt-2" />
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Weight Trend</p>
            <p className="font-display text-xl font-bold text-white">{weightTrend.length ? `${weightTrend[weightTrend.length - 1]} kg` : '—'}</p>
            {weightTrend.length > 1 && (
              <p className={`text-xs mt-1 ${weightTrend[weightTrend.length - 1] < weightTrend[0] ? 'text-lime-400' : 'text-coral-400'}`}>
                {weightTrend[weightTrend.length - 1] < weightTrend[0] ? '▼' : '▲'} {Math.abs(weightTrend[weightTrend.length - 1] - weightTrend[0]).toFixed(1)} kg
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recovery score */}
      {todayMetric?.recovery_score !== null && todayMetric?.recovery_score !== undefined && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Heart size={18} className="text-coral-400" />
              Recovery Score
            </h2>
            <span className="font-display text-2xl font-bold text-white">{todayMetric.recovery_score}%</span>
          </div>
          <ProgressBar value={todayMetric.recovery_score} max={100} color="coral" />
          <p className="text-sm text-ink-300 mt-2">
            {todayMetric.recovery_score >= 80 ? 'Excellent recovery — ready for high intensity training.' :
             todayMetric.recovery_score >= 60 ? 'Good recovery — moderate to high intensity recommended.' :
             todayMetric.recovery_score >= 40 ? 'Moderate recovery — focus on lighter training today.' :
             'Low recovery — prioritize rest and active recovery today.'}
          </p>
        </div>
      )}

      {/* History table */}
      {metrics.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-400" />
            Recent Logs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-400 border-b border-ink-700/60">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Weight</th>
                  <th className="pb-2 font-medium">Steps</th>
                  <th className="pb-2 font-medium">Sleep</th>
                  <th className="pb-2 font-medium">Hydration</th>
                  <th className="pb-2 font-medium">Recovery</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 10).map((m) => (
                  <tr key={m.id} className="border-b border-ink-700/30">
                    <td className="py-2.5 text-ink-200">{new Date(m.metric_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</td>
                    <td className="py-2.5 text-ink-300">{m.weight_kg ? `${m.weight_kg} kg` : '—'}</td>
                    <td className="py-2.5 text-ink-300">{m.steps?.toLocaleString() ?? '—'}</td>
                    <td className="py-2.5 text-ink-300">{m.sleep_hours ? `${m.sleep_hours}h` : '—'}</td>
                    <td className="py-2.5 text-ink-300">{m.hydration_ml ? `${(m.hydration_ml / 1000).toFixed(1)}L` : '—'}</td>
                    <td className="py-2.5 text-ink-300">{m.recovery_score ? `${m.recovery_score}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Log Daily Metrics" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="input" placeholder="72" />
            </div>
            <div>
              <label className="label">Steps</label>
              <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} className="input" placeholder="8000" />
            </div>
            <div>
              <label className="label">Calories Consumed</label>
              <input type="number" value={calConsumed} onChange={(e) => setCalConsumed(e.target.value)} className="input" placeholder="2000" />
            </div>
            <div>
              <label className="label">Calories Burned</label>
              <input type="number" value={calBurned} onChange={(e) => setCalBurned(e.target.value)} className="input" placeholder="500" />
            </div>
            <div>
              <label className="label">Sleep (hours)</label>
              <input type="number" step="0.1" value={sleep} onChange={(e) => setSleep(e.target.value)} className="input" placeholder="7.5" />
            </div>
            <div>
              <label className="label">Hydration (ml)</label>
              <input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} className="input" placeholder="2500" />
            </div>
            <div>
              <label className="label">Recovery Score (0-100)</label>
              <input type="number" min={0} max={100} value={recovery} onChange={(e) => setRecovery(e.target.value)} className="input" placeholder="75" />
            </div>
            <div>
              <label className="label">Resting HR (bpm)</label>
              <input type="number" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} className="input" placeholder="60" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[80px] resize-y" placeholder="How do you feel today?" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Spinner size={18} /> : <><Save size={18} /> Save Metrics</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
