import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, Check, Clock, Play, Flame, Target, Dumbbell, Calendar, Trophy, Download, Lock } from 'lucide-react';
import type { TrainingPlan, PlannedDay } from '@/types';

export function DayDetailPage({ planId, dayIndex }: { planId: string; dayIndex: number }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('training_plans').select('*').eq('id', planId).maybeSingle();
      setPlan(data as TrainingPlan | null);
      setLoading(false);
    })();
  }, [user, planId]);

  if (loading) return <div className="text-ink-300">Loading day...</div>;
  if (!plan) return <div className="text-ink-300">Plan not found. <button onClick={() => navigate('/plans')} className="text-brand-400">Go back</button></div>;

  const day = plan.content.days?.[dayIndex];
  if (!day) return <div className="text-ink-300">Day not found.</div>;

  // Per-drill logged state — stored in day object as drills_logged array
  const drillsLogged: boolean[] = day.drills.map((_, i) => {
    const logged = (day as PlannedDay & { drills_logged?: boolean[] }).drills_logged;
    return logged?.[i] ?? false;
  });
  const allDrillsLogged = drillsLogged.every(Boolean);
  const isComplete = day.completed && allDrillsLogged;

  const toggleDrill = async (drillIdx: number) => {
    if (!plan || !user) return;
    setSaving(true);

    const updatedContent = { ...plan.content };
    if (updatedContent.days) {
      updatedContent.days = updatedContent.days.map((d, i) => {
        if (i !== dayIndex) return d;
        const currentLogged = (d as PlannedDay & { drills_logged?: boolean[] }).drills_logged ?? [];
        const newLogged = [...currentLogged];
        while (newLogged.length < d.drills.length) newLogged.push(false);
        newLogged[drillIdx] = !newLogged[drillIdx];
        return { ...d, drills_logged: newLogged };
      });
    }

    const { data } = await supabase.from('training_plans').update({ content: updatedContent }).eq('id', plan.id).select('*').single();
    if (data) setPlan(data as TrainingPlan);
    setSaving(false);
  };

  const markDayComplete = async () => {
    if (!plan || !user || !allDrillsLogged) return;
    setSaving(true);

    const updatedContent = { ...plan.content };
    if (updatedContent.days) {
      updatedContent.days = updatedContent.days.map((d, i) => i === dayIndex ? { ...d, completed: true } : d);
    }

    const { data } = await supabase.from('training_plans').update({ content: updatedContent }).eq('id', plan.id).select('*').single();
    if (data) setPlan(data as TrainingPlan);

    // Log workout
    if (!day.is_rest_day) {
      await supabase.from('workout_logs').insert({
        user_id: user.id,
        plan_id: plan.id,
        workout_date: new Date().toISOString().slice(0, 10),
        sport: profile?.sport ?? 'general_fitness',
        title: day.title,
        duration_minutes: day.duration_minutes,
        intensity: day.intensity === 'very_high' ? 10 : day.intensity === 'high' ? 8 : day.intensity === 'moderate' ? 6 : 4,
        calories_burned: Math.round(day.duration_minutes * 9),
        completed: true,
        drills_completed: day.drills.map((d) => ({ name: d.name, duration: d.duration })),
      });
    }

    setSaving(false);
  };

  // Check if entire plan is complete (for certificate)
  const allDays = plan.content.days ?? [];
  const completedDays = allDays.filter((d) => d.completed && (!d.is_rest_day)).length;
  const totalSessionDays = allDays.filter((d) => !d.is_rest_day).length;
  const planComplete = completedDays === totalSessionDays && totalSessionDays > 0;

  const downloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 540;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 800, 540);

    // Gold border
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 760, 500);
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, 732, 472);

    // Trophy
    ctx.font = 'bold 60px serif';
    ctx.fillStyle = '#c9a84c';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 400, 130);

    // Title
    ctx.font = 'bold 18px Georgia';
    ctx.fillStyle = '#c9a84c';
    ctx.fillText('CERTIFICATE OF COMPLETION', 400, 175);

    // "This certifies that"
    ctx.font = 'italic 15px Georgia';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('This certifies that', 400, 220);

    // Name
    ctx.font = 'bold 38px Georgia';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(profile?.full_name ?? 'Athlete', 400, 270);

    // Line under name
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 282);
    ctx.lineTo(600, 282);
    ctx.stroke();

    // "has successfully completed"
    ctx.font = 'italic 15px Georgia';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('has successfully completed the training plan', 400, 315);

    // Plan title
    ctx.font = 'bold 24px Georgia';
    ctx.fillStyle = '#4adf86';
    ctx.fillText(`"${plan.title}"`, 400, 360);

    // Date
    ctx.font = '13px Georgia';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`Completed on ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 405);

    // TrainX branding
    ctx.font = 'bold 16px Georgia';
    ctx.fillStyle = '#4adf86';
    ctx.fillText('TrainX — AI Sports & Fitness', 400, 460);
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#666680';
    ctx.fillText('trainx.app', 400, 480);

    const link = document.createElement('a');
    link.download = `TrainX-Certificate-${plan.title.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (day.is_rest_day) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/plans')} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Back to Plans
        </button>
        <div className="card p-12 text-center">
          <Calendar size={40} className="mx-auto text-ink-500 mb-4" />
          <h2 className="font-display text-xl font-bold text-white mb-2">{day.day} — Rest Day</h2>
          <p className="text-ink-300">Take it easy today. Light stretching and mobility work recommended.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/plans')} className="btn-ghost text-sm">
        <ArrowLeft size={16} /> Back to Plans
      </button>

      {/* Day header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${isComplete ? 'bg-lime-500/20 text-lime-400' : 'bg-brand-500/15 text-brand-400'}`}>
                {isComplete ? <Check size={16} /> : dayIndex + 1}
              </span>
              <h1 className="font-display text-xl font-bold text-white">{day.day} — {day.title}</h1>
            </div>
            <p className="text-sm text-ink-400 ml-10">
              {day.date && new Date(day.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} • {day.duration_minutes} min • {day.focus}
            </p>
          </div>
          <span className={`chip text-xs capitalize ${day.intensity === 'very_high' ? 'bg-coral-500/10 text-coral-400' : day.intensity === 'high' ? 'bg-brand-500/10 text-brand-400' : day.intensity === 'moderate' ? 'bg-lime-500/10 text-lime-400' : 'bg-ink-700/50 text-ink-300'}`}>
            {day.intensity?.replace('_', ' ')}
          </span>
        </div>

        {/* Time breakdown */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-ink-800/50 text-center">
            <Clock size={16} className="mx-auto text-ink-400 mb-1" />
            <p className="text-sm font-bold text-white">{day.warmup_minutes} min</p>
            <p className="text-xs text-ink-400">Warm-up</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-500/10 text-center">
            <Dumbbell size={16} className="mx-auto text-brand-400 mb-1" />
            <p className="text-sm font-bold text-white">{day.duration_minutes - (day.warmup_minutes ?? 0) - (day.cooldown_minutes ?? 0)} min</p>
            <p className="text-xs text-ink-400">Main Work</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-800/50 text-center">
            <Clock size={16} className="mx-auto text-ink-400 mb-1" />
            <p className="text-sm font-bold text-white">{day.cooldown_minutes} min</p>
            <p className="text-xs text-ink-400">Cool-down</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-ink-400 mb-1.5">
            <span>Drills logged: {drillsLogged.filter(Boolean).length} / {day.drills.length}</span>
            <span>{Math.round((drillsLogged.filter(Boolean).length / day.drills.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-700/50 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${allDrillsLogged ? 'bg-lime-500' : 'bg-brand-500'}`} style={{ width: `${(drillsLogged.filter(Boolean).length / day.drills.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Drills list — each drill must be individually logged */}
      <div>
        <h2 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Target size={18} className="text-brand-400" /> Drills ({day.drills.length})
        </h2>
        <p className="text-sm text-ink-400 mb-4">Log each drill after completing it. You must log ALL drills to mark this day complete and earn your certificate.</p>

        <div className="space-y-3">
          {day.drills.map((d, i) => {
            const logged = drillsLogged[i];
            return (
              <div key={i} className={`card p-4 transition-all ${logged ? 'border-lime-500/30 bg-lime-500/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleDrill(i)}
                    disabled={saving}
                    className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      logged ? 'bg-lime-500/20 text-lime-400' : 'bg-ink-700/50 text-ink-400 hover:bg-brand-500/20 hover:text-brand-400'
                    }`}
                  >
                    {saving ? <Spinner size={14} /> : logged ? <Check size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${logged ? 'text-lime-400' : 'text-white'}`}>{d.name}</h3>
                      <span className="text-xs text-ink-400">{d.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="chip bg-ink-700/40 text-ink-400 text-[10px] capitalize">{d.intensity}</span>
                      {d.sets && <span className="chip bg-ink-700/40 text-ink-400 text-[10px]">{d.sets}</span>}
                      {d.reps && <span className="chip bg-ink-700/40 text-ink-400 text-[10px]">{d.reps}</span>}
                      {d.rest && <span className="chip bg-ink-700/40 text-ink-400 text-[10px]">{d.rest}</span>}
                      {d.youtube_id && (
                        <a href={`https://www.youtube.com/watch?v=${d.youtube_id}`} target="_blank" rel="noopener noreferrer"
                          className="chip bg-brand-500/10 text-brand-400 text-[10px] hover:bg-brand-500/20 transition-colors">
                          <Play size={10} /> Video
                        </a>
                      )}
                    </div>
                    {d.description && <p className="text-xs text-ink-400 mt-2">{d.description}</p>}
                    {logged && <p className="text-xs text-lime-400 mt-2 font-medium">Logged — great work!</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete day button */}
      <div className="card p-5">
        {!day.completed ? (
          <>
            <button
              onClick={markDayComplete}
              disabled={!allDrillsLogged || saving}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                allDrillsLogged
                  ? 'bg-gradient-to-r from-lime-500 to-lime-400 text-ink-950 hover:from-lime-400 hover:to-lime-300'
                  : 'bg-ink-700/50 text-ink-500 cursor-not-allowed'
              }`}
            >
              {allDrillsLogged ? <><Check size={18} className="inline mr-1.5" /> Mark Day Complete</> : <><Lock size={16} className="inline mr-1.5" /> Log all {day.drills.length} drills to complete</>}
            </button>
            {!allDrillsLogged && (
              <p className="text-xs text-ink-400 text-center mt-2">
                {drillsLogged.filter(Boolean).length} of {day.drills.length} drills logged
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 chip bg-lime-500/10 text-lime-400 mb-3">
              <Check size={16} /> Day Complete
            </div>
            <p className="text-sm text-ink-300">All drills logged. Great work!</p>
          </div>
        )}
      </div>

      {/* Plan completion certificate */}
      {planComplete && (
        <div className="card p-6 bg-gradient-to-r from-brand-500/10 to-lime-500/5 border-brand-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500/20 to-lime-500/10">
              <Trophy size={28} className="text-lime-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-white">Training Plan Complete!</h3>
              <p className="text-sm text-ink-300">You've completed all {totalSessionDays} sessions. Download your certificate of completion.</p>
            </div>
            <button onClick={downloadCertificate} className="btn-primary text-sm">
              <Download size={16} /> Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
