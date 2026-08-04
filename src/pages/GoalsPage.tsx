import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Target, Footprints, Flame, Moon, Droplets, Dumbbell, Scale, Save, Check, Trophy, Download, TrendingUp, Award, Info, Calendar } from 'lucide-react';
import type { FitnessGoal, DailyMetric } from '@/types';

export function GoalsPage() {
  const { user, profile } = useAuth();
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [steps, setSteps] = useState('10000');
  const [calBurned, setCalBurned] = useState('500');
  const [sleep, setSleep] = useState('8');
  const [hydration, setHydration] = useState('2500');
  const [workouts, setWorkouts] = useState('4');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [gRes, mRes] = await Promise.all([
        supabase.from('fitness_goals').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('daily_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(60),
      ]);
      const g = gRes.data as FitnessGoal | null;
      setGoal(g);
      setMetrics((mRes.data as DailyMetric[]) ?? []);
      if (g) {
        setSteps(g.target_steps?.toString() ?? '10000');
        setCalBurned(g.target_calories_burned?.toString() ?? '500');
        setSleep(g.target_sleep_hours?.toString() ?? '8');
        setHydration(g.target_hydration_ml?.toString() ?? '2500');
        setWorkouts(g.target_workouts_per_week?.toString() ?? '4');
        setWeight(g.target_weight_kg?.toString() ?? '');
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      goal_type: 'daily',
      target_steps: Number(steps) || 10000,
      target_calories_burned: Number(calBurned) || 500,
      target_sleep_hours: Number(sleep) || 8,
      target_hydration_ml: Number(hydration) || 2500,
      target_workouts_per_week: Number(workouts) || 4,
      target_weight_kg: weight ? Number(weight) : null,
      updated_at: new Date().toISOString(),
    };
    const { data } = goal
      ? await supabase.from('fitness_goals').update(payload).eq('id', goal.id).select('*').single()
      : await supabase.from('fitness_goals').insert(payload).select('*').single();
    if (data) setGoal(data as FitnessGoal);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Calculate streaks for each goal
  const calculateStreak = (
    checkFn: (m: DailyMetric) => boolean,
  ): { current: number; best: number; eligible: boolean } => {
    if (metrics.length === 0) return { current: 0, best: 0, eligible: false };
    const sorted = [...metrics].sort((a, b) => b.metric_date.localeCompare(a.metric_date));

    let current = 0;
    let best = 0;
    let temp = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (checkFn(sorted[i])) {
        temp++;
        if (i === 0) current = temp;
      } else {
        if (temp > best) best = temp;
        temp = 0;
        if (i === 0) current = 0;
      }
    }
    if (temp > best) best = temp;

    return { current, best, eligible: current >= 30 };
  };

  const stepStreak = calculateStreak((m) => (m.steps ?? 0) >= (goal?.target_steps ?? 10000));
  const calStreak = calculateStreak((m) => (m.calories_burned ?? 0) >= (goal?.target_calories_burned ?? 500));
  const sleepStreak = calculateStreak((m) => (m.sleep_hours ?? 0) >= (goal?.target_sleep_hours ?? 8));
  const hydrationStreak = calculateStreak((m) => (m.hydration_ml ?? 0) >= (goal?.target_hydration_ml ?? 2500));

  // Workout streak — count workouts per week from workout_logs
  const workoutStreak = { current: 0, best: 0, eligible: false }; // simplified — would need workout_logs

  // Today's progress
  const todayMetric = metrics.find((m) => m.metric_date === new Date().toISOString().slice(0, 10));

  const downloadStreakCertificate = (goalName: string, streakDays: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 560;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, 800, 560);
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, 760, 520);
    ctx.lineWidth = 2; ctx.strokeRect(34, 34, 732, 492);
    ctx.font = 'bold 18px Georgia'; ctx.fillStyle = '#c9a84c'; ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF CONSISTENCY', 400, 80);
    ctx.font = 'italic 15px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText('This certificate is proudly presented to', 400, 130);
    ctx.font = 'bold 38px Georgia'; ctx.fillStyle = '#ffffff';
    ctx.fillText(profile?.full_name ?? 'Athlete', 400, 185);
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(200, 200); ctx.lineTo(600, 200); ctx.stroke();
    ctx.font = 'italic 15px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText('for maintaining a daily goal streak of', 400, 245);
    ctx.font = 'bold 48px Georgia'; ctx.fillStyle = '#4adf86';
    ctx.fillText(`${streakDays} DAYS`, 400, 310);
    ctx.font = 'bold 20px Georgia'; ctx.fillStyle = '#c9a84c';
    ctx.fillText(goalName, 400, 350);
    ctx.font = '13px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`Achieved on ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 400);
    ctx.font = 'bold 16px Georgia'; ctx.fillStyle = '#4adf86';
    ctx.fillText('TrainX — AI Sports & Fitness', 400, 455);
    ctx.font = '11px Georgia'; ctx.fillStyle = '#666680';
    ctx.fillText('trainx.app', 400, 475);
    const link = document.createElement('a');
    link.download = `TrainX-Streak-${goalName.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return <div className="text-ink-300">Loading goals...</div>;

  const fields = [
    { icon: Footprints, label: 'Daily Steps', value: steps, setter: setSteps, unit: 'steps', placeholder: '10000', color: 'text-brand-400' },
    { icon: Flame, label: 'Daily Calories Burned', value: calBurned, setter: setCalBurned, unit: 'kcal', placeholder: '500', color: 'text-coral-400' },
    { icon: Moon, label: 'Sleep Target', value: sleep, setter: setSleep, unit: 'hours', placeholder: '8', color: 'text-lime-400' },
    { icon: Droplets, label: 'Daily Hydration', value: hydration, setter: setHydration, unit: 'ml', placeholder: '2500', color: 'text-brand-400' },
    { icon: Dumbbell, label: 'Workouts per Week', value: workouts, setter: setWorkouts, unit: 'sessions', placeholder: '4', color: 'text-brand-400' },
    { icon: Scale, label: 'Target Weight (optional)', value: weight, setter: setWeight, unit: 'kg', placeholder: '70', color: 'text-lime-400' },
  ];

  // Goal tracking sections
  const trackingSections = [
    {
      icon: Footprints,
      label: 'Steps',
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10',
      target: goal?.target_steps ?? 10000,
      current: todayMetric?.steps ?? 0,
      unit: 'steps',
      streak: stepStreak,
      progress: Math.min(100, Math.round(((todayMetric?.steps ?? 0) / (goal?.target_steps ?? 10000)) * 100)),
    },
    {
      icon: Flame,
      label: 'Calories Burned',
      color: 'text-coral-400',
      bgColor: 'bg-coral-500/10',
      target: goal?.target_calories_burned ?? 500,
      current: todayMetric?.calories_burned ?? 0,
      unit: 'kcal',
      streak: calStreak,
      progress: Math.min(100, Math.round(((todayMetric?.calories_burned ?? 0) / (goal?.target_calories_burned ?? 500)) * 100)),
    },
    {
      icon: Moon,
      label: 'Sleep',
      color: 'text-lime-400',
      bgColor: 'bg-lime-500/10',
      target: goal?.target_sleep_hours ?? 8,
      current: todayMetric?.sleep_hours ?? 0,
      unit: 'hours',
      streak: sleepStreak,
      progress: Math.min(100, Math.round(((todayMetric?.sleep_hours ?? 0) / (goal?.target_sleep_hours ?? 8)) * 100)),
    },
    {
      icon: Droplets,
      label: 'Hydration',
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10',
      target: goal?.target_hydration_ml ?? 2500,
      current: todayMetric?.hydration_ml ?? 0,
      unit: 'ml',
      streak: hydrationStreak,
      progress: Math.min(100, Math.round(((todayMetric?.hydration_ml ?? 0) / (goal?.target_hydration_ml ?? 2500)) * 100)),
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Target size={24} className="text-brand-400" />
          Fitness Goals
        </h1>
        <p className="text-ink-300 text-sm mt-1">Set targets, track daily progress, and earn a 30-day streak certificate for each goal</p>
      </div>

      {/* Certificate eligibility banner */}
      <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-lime-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">How to earn certificates</p>
            <p className="text-xs text-ink-300 mt-1">
              Hit any daily goal for 30 consecutive days to earn a Consistency Certificate for that goal.
              Complete all sessions in a training plan to earn a Completion Certificate.
              Complete a challenge to earn a Challenge Certificate.
              Log your metrics daily in Fitness Tracking to build your streaks.
            </p>
          </div>
        </div>
      </div>

      {/* Goal tracking sections */}
      {goal && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-400" /> Today's Progress
          </h2>
          {trackingSections.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${s.bgColor}`}>
                    <s.icon size={18} className={s.color} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs text-ink-400">{s.current.toLocaleString()} / {s.target.toLocaleString()} {s.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-coral-400" />
                    <span className="text-sm font-bold text-white">{s.streak.current}</span>
                    <span className="text-xs text-ink-400">day streak</span>
                  </div>
                  <p className="text-xs text-ink-500">Best: {s.streak.best} days</p>
                </div>
              </div>
              <ProgressBar value={s.progress} max={100} color={s.progress >= 100 ? 'lime' : 'brand'} />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${s.progress >= 100 ? 'text-lime-400 font-medium' : 'text-ink-400'}`}>
                  {s.progress >= 100 ? 'Goal achieved today!' : `${s.progress}% of daily goal`}
                </span>
                {s.streak.eligible ? (
                  <button onClick={() => downloadStreakCertificate(`${s.label} Goal`, s.streak.current)} className="btn-secondary text-xs py-2">
                    <Download size={13} /> 30-Day Certificate
                  </button>
                ) : (
                  <span className="text-xs text-ink-500">
                    {30 - s.streak.current} more days for certificate
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal settings */}
      <div className="card p-6 space-y-5">
        <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
          <Target size={18} className="text-brand-400" /> Set Your Goals
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label}>
              <label className="label flex items-center gap-2">
                <f.icon size={14} className={f.color} />
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="input flex-1"
                />
                <span className="text-xs text-ink-400 w-16 text-right">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? <Spinner size={18} /> : saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Goals</>}
        </button>
      </div>

      {/* Certificate section */}
      <div className="card p-5 bg-gradient-to-r from-brand-500/5 to-transparent border-brand-500/10">
        <h3 className="font-display text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Award size={16} className="text-brand-400" /> Your Certificates
        </h3>
        <div className="space-y-2">
          {trackingSections.map((s) => (
            <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-ink-800/40">
              <div className="flex items-center gap-2">
                <Trophy size={16} className={s.streak.eligible ? 'text-lime-400' : 'text-ink-500'} />
                <div>
                  <p className="text-sm text-white">{s.label} Consistency</p>
                  <p className="text-xs text-ink-400">
                    {s.streak.eligible
                      ? `30+ day streak achieved! Current: ${s.streak.current} days`
                      : `Current streak: ${s.streak.current} days · Need ${30 - s.streak.current} more for certificate`}
                  </p>
                </div>
              </div>
              {s.streak.eligible ? (
                <button onClick={() => downloadStreakCertificate(`${s.label} Goal`, s.streak.current)} className="btn-secondary text-xs py-2">
                  <Download size={13} /> Download
                </button>
              ) : (
                <span className="text-xs text-ink-500 flex items-center gap-1">
                  <Calendar size={12} /> {30 - s.streak.current} days left
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
