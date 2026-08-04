import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Flame, Footprints, Droplets, Moon, Heart, Activity, TrendingUp, Calendar, ChevronRight, Dumbbell, Trophy } from 'lucide-react';
import type { WorkoutLog, DailyMetric, TrainingPlan, ChallengeParticipant, Challenge } from '@/types';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const { navigate } = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [todayMetrics, setTodayMetrics] = useState<DailyMetric | null>(null);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [challenges, setChallenges] = useState<(ChallengeParticipant & { challenge: Challenge })[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [wRes, mRes, pRes, cRes] = await Promise.all([
        supabase.from('workout_logs').select('*').eq('user_id', user.id).order('workout_date', { ascending: false }).limit(30),
        supabase.from('daily_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('training_plans').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('challenge_participants').select('*, challenge:challenges(*)').eq('user_id', user.id).eq('completed', false),
      ]);

      setWorkouts((wRes.data as WorkoutLog[]) ?? []);
      setTodayMetrics(mRes.data as DailyMetric | null);
      setActivePlan(pRes.data as TrainingPlan | null);
      setChallenges((cRes.data as (ChallengeParticipant & { challenge: Challenge })[]) ?? []);

      // Calculate streak
      const ws = (wRes.data as WorkoutLog[]) ?? [];
      let s = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().slice(0, 10);
        if (ws.some((w) => w.workout_date === dStr && w.completed)) s++;
        else if (i > 0) break;
      }
      setStreak(s);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="text-ink-300">Loading dashboard...</div>;

  const totalWorkouts = workouts.length;
  const totalCalories = workouts.reduce((s, w) => s + w.calories_burned, 0);
  const totalMinutes = workouts.reduce((s, w) => s + w.duration_minutes, 0);
  const weekWorkouts = workouts.filter((w) => {
    const d = new Date(w.workout_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  const todayPlan = activePlan?.content?.days?.find((d) => d.day === 'Today') ?? activePlan?.content?.days?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Athlete'}</h1>
          <p className="text-ink-300 text-sm mt-1">
            {profile?.sport.replace('_', ' ')} • {profile?.fitness_level} • {streak} day streak
          </p>
        </div>
        <button onClick={() => navigate('/plans')} className="btn-primary text-sm">
          <Calendar size={16} />
          View Training Plans
        </button>
      </div>

      {/* Streak banner */}
      {streak > 0 && (
        <div className="card p-5 flex items-center gap-4 bg-gradient-to-r from-coral-500/10 to-transparent border-coral-500/20">
          <div className="p-3 rounded-xl bg-coral-500/20">
            <Flame size={24} className="text-coral-400" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-white">{streak} Day Streak!</p>
            <p className="text-sm text-ink-300">Keep the momentum going. Train today to extend your streak.</p>
          </div>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} label="Total Workouts" value={totalWorkouts} accent="brand" />
        <StatCard icon={Flame} label="Calories Burned" value={totalCalories.toLocaleString()} accent="coral" />
        <StatCard icon={Activity} label="Training Min" value={totalMinutes} accent="lime" />
        <StatCard icon={Calendar} label="This Week" value={weekWorkouts} unit="sessions" accent="brand" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's plan */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-white">Today's Training</h2>
            <button onClick={() => navigate('/plans')} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          {todayPlan ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="chip bg-brand-500/10 text-brand-400">{todayPlan.focus}</span>
                <span className="chip bg-ink-700/50 text-ink-300">{todayPlan.duration_minutes} min</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-3">{todayPlan.title}</h3>
              <div className="space-y-2">
                {todayPlan.drills.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50">
                    <span className="text-sm text-ink-100">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-400">{d.duration}</span>
                      <span className="chip bg-ink-700/50 text-ink-300 capitalize text-[10px]">{d.intensity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-ink-300 mb-4">No active training plan yet.</p>
              <button onClick={() => navigate('/plans')} className="btn-primary text-sm">
                Generate Your First Plan
              </button>
            </div>
          )}
        </div>

        {/* Today's metrics */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4">Today's Health</h2>
          {todayMetrics ? (
            <div className="space-y-4">
              <MetricRow icon={Footprints} label="Steps" value={todayMetrics.steps?.toLocaleString() ?? '—'} max={10000} current={todayMetrics.steps ?? 0} color="brand" />
              <MetricRow icon={Flame} label="Calories" value={`${todayMetrics.calories_burned ?? 0} kcal`} max={500} current={todayMetrics.calories_burned ?? 0} color="coral" />
              <MetricRow icon={Droplets} label="Hydration" value={`${((todayMetrics.hydration_ml ?? 0) / 1000).toFixed(1)}L`} max={2500} current={todayMetrics.hydration_ml ?? 0} color="brand" />
              <MetricRow icon={Moon} label="Sleep" value={`${todayMetrics.sleep_hours ?? 0}h`} max={8} current={todayMetrics.sleep_hours ?? 0} color="lime" />
              <MetricRow icon={Heart} label="Recovery" value={`${todayMetrics.recovery_score ?? 0}%`} max={100} current={todayMetrics.recovery_score ?? 0} color="coral" />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-ink-300 mb-4">No metrics logged today.</p>
              <button onClick={() => navigate('/tracking')} className="btn-secondary text-sm">
                Log Today's Metrics
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active challenges */}
      {challenges.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-white">Active Challenges</h2>
            <button onClick={() => navigate('/challenges')} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.slice(0, 3).map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-ink-800/50 border border-ink-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={16} className="text-lime-400" />
                  <span className="text-sm font-semibold text-white truncate">{c.challenge.title}</span>
                </div>
                <ProgressBar value={c.progress} max={c.challenge.target_value} color="lime" className="mb-2" />
                <p className="text-xs text-ink-400">{c.progress} / {c.challenge.target_value} {c.challenge.target_unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, max, current, color }: {
  icon: typeof Flame; label: string; value: string; max: number; current: number; color: 'brand' | 'lime' | 'coral';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-ink-300" />
          <span className="text-sm text-ink-200">{label}</span>
        </div>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
      <ProgressBar value={current} max={max} color={color} />
    </div>
  );
}
