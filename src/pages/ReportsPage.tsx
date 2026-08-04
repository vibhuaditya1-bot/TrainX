import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Dumbbell, Flame, Clock, TrendingUp, Calendar, Award, Target, Activity } from 'lucide-react';
import type { WorkoutLog, DailyMetric } from '@/types';

export function ReportsPage() {
  const { profile, user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [wRes, mRes] = await Promise.all([
        supabase.from('workout_logs').select('*').eq('user_id', user.id).order('workout_date', { ascending: false }).limit(90),
        supabase.from('daily_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(90),
      ]);
      setWorkouts((wRes.data as WorkoutLog[]) ?? []);
      setMetrics((mRes.data as DailyMetric[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const filteredWorkouts = useMemo(() => {
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return workouts.filter((w) => new Date(w.workout_date) >= cutoff);
  }, [workouts, range]);

  const filteredMetrics = useMemo(() => {
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return metrics.filter((m) => new Date(m.metric_date) >= cutoff);
  }, [metrics, range]);

  if (loading) return <div className="text-ink-300">Generating report...</div>;

  // Summary stats
  const totalWorkouts = filteredWorkouts.length;
  const totalCalories = filteredWorkouts.reduce((s, w) => s + w.calories_burned, 0);
  const totalMinutes = filteredWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const avgIntensity = totalWorkouts ? (filteredWorkouts.reduce((s, w) => s + w.intensity, 0) / totalWorkouts).toFixed(1) : '0';

  // Sport breakdown
  const sportBreakdown = filteredWorkouts.reduce((acc, w) => {
    acc[w.sport] = (acc[w.sport] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Weekly chart data (last 4 weeks)
  const weeks = range === '7' ? 1 : range === '30' ? 4 : 12;
  const weeklyData: { label: string; workouts: number; calories: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7 - 6);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const ws = filteredWorkouts.filter((w) => {
      const d = new Date(w.workout_date);
      return d >= weekStart && d <= weekEnd;
    });
    weeklyData.push({
      label: `W${weeks - i}`,
      workouts: ws.length,
      calories: ws.reduce((s, w) => s + w.calories_burned, 0),
    });
  }

  const maxWeeklyCal = Math.max(...weeklyData.map((w) => w.calories), 1);
  const maxWorkouts = Math.max(...weeklyData.map((w) => w.workouts), 1);

  // Metrics summary
  const avgSteps = filteredMetrics.length ? Math.round(filteredMetrics.reduce((s, m) => s + (m.steps ?? 0), 0) / filteredMetrics.length) : 0;
  const avgSleep = filteredMetrics.length ? (filteredMetrics.reduce((s, m) => s + (m.sleep_hours ?? 0), 0) / filteredMetrics.length).toFixed(1) : '0';
  const avgRecovery = filteredMetrics.length ? Math.round(filteredMetrics.reduce((s, m) => s + (m.recovery_score ?? 0), 0) / filteredMetrics.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Performance Report</h1>
          <p className="text-ink-300 text-sm mt-1">Your training analytics and progress insights</p>
        </div>
        <div className="flex gap-2">
          {(['7', '30', '90'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`chip ${range === r ? 'bg-brand-500/20 text-brand-300' : 'bg-ink-800/50 text-ink-300'}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} label="Workouts" value={totalWorkouts} accent="brand" />
        <StatCard icon={Flame} label="Calories" value={totalCalories.toLocaleString()} accent="coral" />
        <StatCard icon={Clock} label="Total Time" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} accent="lime" />
        <StatCard icon={TrendingUp} label="Avg Intensity" value={avgIntensity} unit="/10" accent="brand" />
      </div>

      {/* Weekly activity chart */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-400" />
          Weekly Activity
        </h2>
        <div className="flex items-end justify-between gap-3 h-48">
          {weeklyData.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-full gap-1">
                <div className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-400 transition-all duration-500" style={{ height: `${(w.workouts / maxWorkouts) * 100}%`, minHeight: w.workouts > 0 ? '8px' : '2px' }} title={`${w.workouts} workouts`} />
                <span className="text-xs text-white font-semibold">{w.workouts}</span>
              </div>
              <span className="text-xs text-ink-400">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calories burned chart */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Flame size={18} className="text-coral-400" />
          Calories Burned per Week
        </h2>
        <div className="flex items-end justify-between gap-3 h-48">
          {weeklyData.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-full gap-1">
                <div className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-coral-500 to-coral-400 transition-all duration-500" style={{ height: `${(w.calories / maxWeeklyCal) * 100}%`, minHeight: w.calories > 0 ? '8px' : '2px' }} title={`${w.calories} kcal`} />
                <span className="text-xs text-white font-semibold">{w.calories}</span>
              </div>
              <span className="text-xs text-ink-400">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sport breakdown */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-lime-400" />
            Training Distribution
          </h2>
          {Object.keys(sportBreakdown).length === 0 ? (
            <p className="text-ink-300 text-sm">No workouts in this period.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(sportBreakdown).sort((a, b) => b[1] - a[1]).map(([sport, count]) => (
                <div key={sport}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink-200 capitalize">{sport.replace('_', ' ')}</span>
                    <span className="text-sm font-semibold text-white">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lime-400 transition-all duration-500" style={{ width: `${(count / totalWorkouts) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health metrics */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-brand-400" />
            Health Averages
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
              <span className="text-sm text-ink-200">Avg Daily Steps</span>
              <span className="font-display text-lg font-bold text-white">{avgSteps.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
              <span className="text-sm text-ink-200">Avg Sleep</span>
              <span className="font-display text-lg font-bold text-white">{avgSleep}h</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
              <span className="text-sm text-ink-200">Avg Recovery Score</span>
              <span className="font-display text-lg font-bold text-white">{avgRecovery}%</span>
            </div>
            {profile?.bmi && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
                <span className="text-sm text-ink-200">Current BMI</span>
                <span className="font-display text-lg font-bold text-white">{profile.bmi}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent workouts */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-brand-400" />
          Recent Workouts
        </h2>
        {filteredWorkouts.length === 0 ? (
          <p className="text-ink-300 text-sm">No workouts logged in this period.</p>
        ) : (
          <div className="space-y-2">
            {filteredWorkouts.slice(0, 10).map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/10">
                    <Dumbbell size={16} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{w.title}</p>
                    <p className="text-xs text-ink-400 capitalize">{w.sport.replace('_', ' ')} • {new Date(w.workout_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-ink-300">{w.duration_minutes}m</span>
                  <span className="text-coral-400">{w.calories_burned} kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
