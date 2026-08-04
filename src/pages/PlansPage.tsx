import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { generatePlan, type PlanParams } from '@/lib/ai';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { CalendarRange, Plus, Check, Clock, Calendar, Trash2, RefreshCw, ChevronRight, User, MapPin, Timer, Target, Trophy, Download, Info } from 'lucide-react';
import type { TrainingPlan, Drill, PlanType, PlanDuration, WorkoutLength, PlannedDay } from '@/types';

export function PlansPage() {
  const { profile, user } = useAuth();
  const { navigate } = useRouter();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  // Questionnaire state
  const [duration, setDuration] = useState<PlanDuration>('7');
  const [workoutLength, setWorkoutLength] = useState<WorkoutLength>('30');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [hasPartner, setHasPartner] = useState(false);
  const [location, setLocation] = useState<'home' | 'park' | 'gym' | 'outdoor'>('home');
  const [focus, setFocus] = useState('mixed');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [pRes, dRes] = await Promise.all([
        supabase.from('training_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('drills').select('*'),
      ]);
      setPlans((pRes.data as TrainingPlan[]) ?? []);
      setDrills((dRes.data as Drill[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleGenerate = async () => {
    if (!profile || !user) return;
    setGenerating(true);

    const params: PlanParams = { duration, workoutLength, sessionsPerWeek, hasPartner, location, focus };
    const content = generatePlan(profile, drills, params);

    const planType: PlanType = duration === '7' ? 'weekly' : duration === '30' ? 'monthly' : 'custom';
    const totalDays = Number(duration);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + totalDays);
    const title = `${totalDays}-Day ${profile.sport.replace('_', ' ')} Plan • ${sessionsPerWeek}×/week • ${workoutLength}min`;

    await supabase.from('training_plans').update({ status: 'archived' }).eq('user_id', user.id).eq('status', 'active');

    const { data } = await supabase.from('training_plans').insert({
      user_id: user.id, plan_type: planType, title, content, status: 'active', end_date: endDate.toISOString().slice(0, 10),
    }).select('*').single();

    if (data) {
      setPlans((prev) => [data as TrainingPlan, ...prev]);
      setSelectedPlan(data as TrainingPlan);
    }
    setGenerating(false);
    setShowGen(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('training_plans').delete().eq('id', id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlan?.id === id) setSelectedPlan(null);
  };

  const downloadCertificate = (plan: TrainingPlan) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 540;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, 800, 540);
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, 760, 500);
    ctx.lineWidth = 2; ctx.strokeRect(34, 34, 732, 472);
    ctx.font = 'bold 60px serif'; ctx.fillStyle = '#c9a84c'; ctx.textAlign = 'center';
    ctx.fillText('🏆', 400, 130);
    ctx.font = 'bold 18px Georgia'; ctx.fillStyle = '#c9a84c';
    ctx.fillText('CERTIFICATE OF COMPLETION', 400, 175);
    ctx.font = 'italic 15px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText('This certifies that', 400, 220);
    ctx.font = 'bold 38px Georgia'; ctx.fillStyle = '#ffffff';
    ctx.fillText(profile?.full_name ?? 'Athlete', 400, 270);
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(200, 282); ctx.lineTo(600, 282); ctx.stroke();
    ctx.font = 'italic 15px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText('has successfully completed the training plan', 400, 315);
    ctx.font = 'bold 24px Georgia'; ctx.fillStyle = '#4adf86';
    ctx.fillText(`"${plan.title}"`, 400, 360);
    ctx.font = '13px Georgia'; ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`Completed on ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 405);
    ctx.font = 'bold 16px Georgia'; ctx.fillStyle = '#4adf86';
    ctx.fillText('TrainX — AI Sports & Fitness', 400, 460);
    ctx.font = '11px Georgia'; ctx.fillStyle = '#666680';
    ctx.fillText('trainx.app', 400, 480);
    const link = document.createElement('a');
    link.download = `TrainX-Certificate-${plan.title.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return <div className="text-ink-300">Loading plans...</div>;

  const activePlans = plans.filter((p) => p.status === 'active');
  const archivedPlans = plans.filter((p) => p.status !== 'active');

  const isPlanComplete = (plan: TrainingPlan) => {
    const sessions = plan.content.days?.filter((d) => !d.is_rest_day) ?? [];
    return sessions.length > 0 && sessions.every((d) => d.completed);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Training Plans</h1>
          <p className="text-ink-300 text-sm mt-1">Day-by-day plans with precise time budgets — tap any day to log drills</p>
        </div>
      </div>

      {/* Certificate eligibility info */}
      <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-lime-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">How to earn a training plan certificate</p>
            <p className="text-xs text-ink-300 mt-1">
              Open each day and log every drill individually. Once all drills in a day are logged, you can mark that day complete.
              When every session day in the plan is complete, a Download Certificate button appears on the plan card and day page.
              The certificate includes your name, plan title, and completion date.
            </p>
          </div>
        </div>
        <button onClick={() => setShowGen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Generate Plan
        </button>
      </div>

      {activePlans.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarRange size={40} className="mx-auto text-ink-500 mb-4" />
          <h3 className="font-display text-lg font-bold text-white mb-2">No active training plans</h3>
          <p className="text-ink-300 mb-6 max-w-md mx-auto">
            Answer a few quick questions and your AI coach will build a precise day-by-day plan.
            Each day has its own page where you log drills individually.
          </p>
          <button onClick={() => setShowGen(true)} className="btn-primary">
            <Plus size={18} /> Generate Your First Plan
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePlans.map((plan) => {
            const sessions = plan.content.days?.filter((d) => !d.is_rest_day) ?? [];
            const completed = sessions.filter((d) => d.completed).length;
            const totalDays = plan.content.totalDays ?? plan.content.days?.length ?? 0;
            const complete = isPlanComplete(plan);
            return (
              <div key={plan.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="chip bg-brand-500/10 text-brand-400">{totalDays} days</span>
                  {complete ? (
                    <span className="chip bg-lime-500/10 text-lime-400"><Check size={12} /> Complete</span>
                  ) : (
                    <span className="chip bg-ink-700/50 text-ink-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> active</span>
                  )}
                </div>
                <h3 className="font-display text-base font-bold text-white mb-1">{plan.title}</h3>
                <p className="text-sm text-ink-300 line-clamp-2">{plan.content.summary}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {sessions.length} sessions</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {plan.content.workoutLength ?? 30} min</span>
                  <span className="flex items-center gap-1"><Check size={12} /> {completed}/{sessions.length}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 mb-3">
                  <div className="h-1.5 rounded-full bg-ink-700/50 overflow-hidden">
                    <div className={`h-full rounded-full ${complete ? 'bg-lime-500' : 'bg-brand-500'}`} style={{ width: `${sessions.length ? (completed / sessions.length) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Day list — each links to its own page */}
                <div className="space-y-1.5 mb-3">
                  {plan.content.days?.slice(0, 5).map((d, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/plans/${plan.id}/${i}`)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all ${
                        d.completed ? 'bg-lime-500/5 text-lime-400' : d.is_rest_day ? 'bg-ink-800/30 text-ink-500' : 'bg-ink-800/50 text-ink-300 hover:bg-brand-500/10 hover:text-brand-300'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        d.completed ? 'bg-lime-500/20' : d.is_rest_day ? 'bg-ink-700/30' : 'bg-brand-500/15'
                      }`}>
                        {d.completed ? <Check size={10} /> : i + 1}
                      </span>
                      <span className="flex-1 truncate">{d.day} — {d.is_rest_day ? 'Rest' : d.title}</span>
                      {!d.is_rest_day && <ChevronRight size={12} className="shrink-0" />}
                    </button>
                  ))}
                  {plan.content.days && plan.content.days.length > 5 && (
                    <button onClick={() => setSelectedPlan(plan)} className="w-full text-center text-xs text-brand-400 hover:text-brand-300 py-1">
                      View all {plan.content.days.length} days →
                    </button>
                  )}
                </div>

                {/* Certificate if complete */}
                {complete && (
                  <button onClick={() => downloadCertificate(plan)} className="btn-secondary text-xs w-full mb-2">
                    <Download size={13} /> Download Certificate
                  </button>
                )}

                <button onClick={() => setSelectedPlan(plan)} className="btn-ghost text-xs w-full">
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {archivedPlans.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-3">Past Plans</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPlans.map((plan) => (
              <div key={plan.id} className="card p-5 opacity-70">
                <span className="chip bg-ink-700/50 text-ink-400">{plan.plan_type}</span>
                <h3 className="font-display text-base font-bold text-white mt-2">{plan.title}</h3>
                <p className="text-xs text-ink-400 mt-1">{plan.status}</p>
                {isPlanComplete(plan) && (
                  <button onClick={() => downloadCertificate(plan)} className="btn-secondary text-xs mt-3 w-full">
                    <Download size={13} /> Certificate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate modal */}
      <Modal open={showGen} onClose={() => setShowGen(false)} title="Generate AI Training Plan" size="lg">
        {generating ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Spinner className="text-brand-400" size={32} />
            <p className="text-ink-300">Your AI coach is building a day-by-day plan...</p>
            <p className="text-ink-400 text-sm">Filling every session to your exact time budget</p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-ink-300 text-sm">
              Answer a few questions to personalize your plan. Every session will be filled to your exact time budget — warm-up, drills, and cool-down.
            </p>

            <div>
              <label className="label flex items-center gap-2"><Calendar size={14} /> How long should the plan run?</label>
              <div className="grid grid-cols-4 gap-2">
                {([ { v: '7' as PlanDuration, l: '7 days', s: '1 week' }, { v: '14' as PlanDuration, l: '14 days', s: '2 weeks' }, { v: '30' as PlanDuration, l: '30 days', s: '1 month' }, { v: '90' as PlanDuration, l: '90 days', s: '3 months' }]).map((o) => (
                  <button key={o.v} onClick={() => setDuration(o.v)}
                    className={`p-3 rounded-xl border text-center transition-all ${duration === o.v ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'}`}>
                    <span className={`block text-sm font-bold ${duration === o.v ? 'text-brand-400' : 'text-white'}`}>{o.l}</span>
                    <span className="block text-xs text-ink-400">{o.s}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2"><Timer size={14} /> How long should each workout be?</label>
              <div className="grid grid-cols-5 gap-2">
                {(['15', '30', '45', '60', '90'] as WorkoutLength[]).map((len) => (
                  <button key={len} onClick={() => setWorkoutLength(len)}
                    className={`p-3 rounded-xl border text-center transition-all ${workoutLength === len ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'}`}>
                    <span className={`block text-sm font-bold ${workoutLength === len ? 'text-brand-400' : 'text-white'}`}>{len}</span>
                    <span className="block text-xs text-ink-400">min</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2"><Calendar size={14} /> Sessions per week: <span className="text-brand-400 font-bold">{sessionsPerWeek}</span></label>
              <input type="range" min={1} max={7} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Number(e.target.value))} className="w-full accent-brand-500" />
              <div className="flex justify-between text-xs text-ink-400 mt-1"><span>1 day</span><span>7 days</span></div>
            </div>

            <div>
              <label className="label flex items-center gap-2"><MapPin size={14} /> Where will you train?</label>
              <div className="grid grid-cols-4 gap-2">
                {([ { v: 'home' as const, l: 'Home' }, { v: 'park' as const, l: 'Park' }, { v: 'gym' as const, l: 'Gym' }, { v: 'outdoor' as const, l: 'Outdoor' }]).map((o) => (
                  <button key={o.v} onClick={() => setLocation(o.v)}
                    className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${location === o.v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2"><User size={14} /> Do you have a training partner?</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setHasPartner(false)} className={`p-3 rounded-xl border text-sm font-medium transition-all ${!hasPartner ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300'}`}>Solo training</button>
                <button onClick={() => setHasPartner(true)} className={`p-3 rounded-xl border text-sm font-medium transition-all ${hasPartner ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300'}`}>With a partner</button>
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2"><Target size={14} /> Training focus</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([ { v: 'mixed', l: 'Mixed (all-round)' }, { v: 'Skill & Technique', l: 'Skill & Technique' }, { v: 'Strength & Power', l: 'Strength & Power' }, { v: 'Speed & Agility', l: 'Speed & Agility' }, { v: 'Endurance', l: 'Endurance' }, { v: 'Recovery & Mobility', l: 'Recovery & Mobility' }]).map((o) => (
                  <button key={o.v} onClick={() => setFocus(o.v)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${focus === o.v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} className="btn-primary w-full text-base py-3.5">
              <Check size={18} /> Generate My Plan
            </button>
          </div>
        )}
      </Modal>

      {/* Plan detail modal (overview) */}
      <Modal open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title={selectedPlan?.title} size="xl">
        {selectedPlan && (
          <div className="space-y-4">
            <p className="text-ink-200">{selectedPlan.content.summary}</p>
            {selectedPlan.content.notes && (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-brand-300">
                <span className="font-semibold">Coach notes: </span>{selectedPlan.content.notes}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                <p className="text-xs text-ink-400">Total Days</p>
                <p className="font-display text-lg font-bold text-white">{selectedPlan.content.totalDays ?? selectedPlan.content.days?.length ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                <p className="text-xs text-ink-400">Sessions</p>
                <p className="font-display text-lg font-bold text-white">{selectedPlan.content.days?.filter((d) => !d.is_rest_day).length ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                <p className="text-xs text-ink-400">Per Session</p>
                <p className="font-display text-lg font-bold text-white">{selectedPlan.content.workoutLength ?? 30} min</p>
              </div>
            </div>

            {/* Day list — each links to its own page */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {selectedPlan.content.days?.map((day, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(`/plans/${selectedPlan.id}/${i}`); setSelectedPlan(null); }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    day.completed ? 'border-lime-500/30 bg-lime-500/5' : day.is_rest_day ? 'border-ink-700/40 bg-ink-800/30' : 'border-ink-700/60 bg-ink-800/50 hover:border-brand-500 hover:bg-brand-500/5'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    day.completed ? 'bg-lime-500/20 text-lime-400' : day.is_rest_day ? 'bg-ink-700/50 text-ink-400' : 'bg-brand-500/15 text-brand-400'
                  }`}>
                    {day.completed ? <Check size={14} /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${day.completed ? 'text-lime-400' : day.is_rest_day ? 'text-ink-400' : 'text-white'}`}>
                      {day.day} — {day.is_rest_day ? 'Rest & Recovery' : day.title}
                    </p>
                    <p className="text-xs text-ink-400">
                      {day.date && new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      {!day.is_rest_day && ` • ${day.duration_minutes} min • ${day.focus}`}
                    </p>
                  </div>
                  {!day.is_rest_day && <ChevronRight size={16} className="text-ink-400 shrink-0" />}
                </button>
              ))}
            </div>

            {isPlanComplete(selectedPlan) && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-lime-500/5 border border-brand-500/20 flex items-center gap-3">
                <Trophy size={24} className="text-lime-400" />
                <div className="flex-1">
                  <p className="font-semibold text-white">Plan Complete!</p>
                  <p className="text-xs text-ink-300">All sessions logged. Download your certificate.</p>
                </div>
                <button onClick={() => downloadCertificate(selectedPlan)} className="btn-primary text-sm">
                  <Download size={16} /> Certificate
                </button>
              </div>
            )}

            <div className="flex justify-between pt-2 sticky bottom-0 bg-ink-850/95 backdrop-blur-xl -mx-5 -mb-5 px-5 py-3 border-t border-ink-700/60">
              <button onClick={() => handleDelete(selectedPlan.id)} className="btn-ghost text-coral-400 text-sm">
                <Trash2 size={16} /> Delete
              </button>
              <button onClick={() => { setShowGen(true); }} className="btn-secondary text-sm">
                <RefreshCw size={16} /> Regenerate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
