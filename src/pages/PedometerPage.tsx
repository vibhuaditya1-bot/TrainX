import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Footprints, Play, Pause, Plus, Activity, TrendingUp, Flame, MapPin, Zap, AlertCircle, Smartphone } from 'lucide-react';
import type { DailyMetric } from '@/types';

const STEP_LENGTH_M = 0.762;
const STEP_THRESHOLD = 12;
const STEP_MIN_INTERVAL_MS = 250;

export function PedometerPage() {
  const { user } = useAuth();
  const [steps, setSteps] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [todayMetric, setTodayMetric] = useState<DailyMetric | null>(null);
  const [weekData, setWeekData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualSteps, setManualSteps] = useState('');
  const [sensorSupported, setSensorSupported] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const baseStepsRef = useRef<number>(0);
  const lastStepTimeRef = useRef<number>(0);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: todayData } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('metric_date', today)
        .maybeSingle();
      setTodayMetric(todayData as DailyMetric | null);
      setSteps((todayData as DailyMetric)?.steps ?? 0);
      baseStepsRef.current = (todayData as DailyMetric)?.steps ?? 0;

      const { data: week } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false })
        .limit(7);
      setWeekData((week as DailyMetric[]) ?? []);
      setLoading(false);
    })();

    if (typeof window.DeviceMotionEvent !== 'undefined') {
      setSensorSupported(true);
    } else {
      setSensorSupported(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tracking) {
      if (motionHandlerRef.current) {
        window.removeEventListener('devicemotion', motionHandlerRef.current);
        motionHandlerRef.current = null;
      }
      if (saveTimerRef.current) {
        window.clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    if (sensorSupported === false) {
      setTracking(false);
      return;
    }

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();
      if (magnitude > STEP_THRESHOLD && now - lastStepTimeRef.current > STEP_MIN_INTERVAL_MS) {
        lastStepTimeRef.current = now;
        setSteps((prev) => {
          const newSteps = prev + 1;
          baseStepsRef.current = newSteps;
          return newSteps;
        });
      }
    };

    motionHandlerRef.current = handleMotion;
    window.addEventListener('devicemotion', handleMotion);

    saveTimerRef.current = window.setInterval(() => {
      setSteps((currentSteps) => {
        saveSteps(currentSteps);
        return currentSteps;
      });
    }, 10000);

    return () => {
      if (motionHandlerRef.current) {
        window.removeEventListener('devicemotion', motionHandlerRef.current);
        motionHandlerRef.current = null;
      }
      if (saveTimerRef.current) {
        window.clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [tracking, sensorSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSteps = async (stepCount: number) => {
    if (!user) return;
    const distanceKm = (stepCount * STEP_LENGTH_M) / 1000;
    const caloriesBurned = Math.round(stepCount * 0.04);

    const payload = {
      user_id: user.id,
      metric_date: today,
      steps: stepCount,
      calories_burned: caloriesBurned,
      notes: `Tracked via pedometer — ${distanceKm.toFixed(2)} km`,
    };

    const { data } = await supabase
      .from('daily_metrics')
      .upsert(payload, { onConflict: 'user_id,metric_date' })
      .select('*')
      .single();

    if (data) {
      setTodayMetric(data as DailyMetric);
      setWeekData((prev) => {
        const exists = prev.find((m) => m.metric_date === today);
        if (exists) return prev.map((m) => m.metric_date === today ? data as DailyMetric : m);
        return [data as DailyMetric, ...prev];
      });
    }
  };

  const handleStartStop = async () => {
    if (tracking) {
      setTracking(false);
      await saveSteps(steps);
    } else {
      const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (DME && typeof DME.requestPermission === 'function') {
        try {
          const result = await DME.requestPermission();
          if (result !== 'granted') {
            setPermissionDenied(true);
            return;
          }
        } catch {
          setPermissionDenied(true);
          return;
        }
      }
      baseStepsRef.current = steps;
      lastStepTimeRef.current = 0;
      setTracking(true);
    }
  };

  const handleManualAdd = async () => {
    const add = Number(manualSteps);
    if (!add || add <= 0) return;
    const newSteps = steps + add;
    setSteps(newSteps);
    baseStepsRef.current = newSteps;
    setManualSteps('');
    await saveSteps(newSteps);
  };

  const handleManualSet = async () => {
    const setVal = Number(manualSteps);
    if (!setVal || setVal < 0) return;
    setSteps(setVal);
    baseStepsRef.current = setVal;
    setManualSteps('');
    await saveSteps(setVal);
  };

  if (loading) return <div className="text-ink-300">Loading pedometer...</div>;

  const distanceKm = (steps * STEP_LENGTH_M) / 1000;
  const caloriesBurned = Math.round(steps * 0.04);
  const stepGoal = 10000;
  const goalPct = Math.min(100, Math.round((steps / stepGoal) * 100));

  const maxWeekSteps = Math.max(...weekData.map((d) => d.steps ?? 0), stepGoal);
  const weekDays = weekData.slice().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Step Tracker</h1>
        <p className="text-ink-300 text-sm mt-1">Track your daily steps using your phone's motion sensor, or log manually</p>
      </div>

      {/* Sensor not supported warning */}
      {sensorSupported === false && (
        <div className="card p-4 bg-coral-500/5 border-coral-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-coral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-coral-400">Motion sensor not available</p>
              <p className="text-xs text-ink-300 mt-1">
                Your device or browser doesn't support motion detection. This feature works on mobile phones with an accelerometer.
                You can still log steps manually below — perfect for adding counts from a phone health app or fitness band.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission denied warning */}
      {permissionDenied && (
        <div className="card p-4 bg-coral-500/5 border-coral-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-coral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-coral-400">Motion access denied</p>
              <p className="text-xs text-ink-300 mt-1">
                You declined motion sensor access. You can still log steps manually below, or reload the page to try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main pedometer display */}
      <div className="card p-8 relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent transition-opacity duration-500 ${tracking ? 'opacity-100' : 'opacity-30'}`} />

        <div className="relative z-10 flex flex-col items-center">
          {tracking && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1.5 chip bg-coral-500/20 text-coral-400 text-xs">
              <span className="h-2 w-2 rounded-full bg-coral-400 animate-ping absolute" />
              <span className="h-2 w-2 rounded-full bg-coral-400" />
              Sensing motion
            </div>
          )}

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-700/10 mb-4">
              <Footprints size={48} className="text-brand-400" />
            </div>
            <p className="font-display text-6xl font-bold text-white tabular-nums tracking-tight">
              {steps.toLocaleString()}
            </p>
            <p className="text-ink-400 text-sm mt-1">steps today</p>
          </div>

          <div className="w-full max-w-xs mb-6">
            <div className="flex justify-between text-xs text-ink-400 mb-1.5">
              <span>Daily goal: {stepGoal.toLocaleString()}</span>
              <span className={goalPct >= 100 ? 'text-lime-400 font-bold' : 'text-brand-400 font-bold'}>{goalPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-ink-700/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${goalPct >= 100 ? 'bg-gradient-to-r from-lime-500 to-lime-400' : 'bg-gradient-to-r from-brand-500 to-brand-400'}`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            {goalPct >= 100 && (
              <p className="text-center text-lime-400 text-sm mt-2 font-medium">Daily goal achieved!</p>
            )}
          </div>

          <button
            onClick={handleStartStop}
            disabled={sensorSupported === false}
            className={`px-8 py-3.5 rounded-full font-semibold text-sm transition-all ${
              tracking
                ? 'bg-coral-500/20 text-coral-400 border border-coral-500/40 hover:bg-coral-500/30'
                : sensorSupported === false
                ? 'bg-ink-700/50 text-ink-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-500 to-brand-600 text-ink-950 hover:from-brand-400 hover:to-brand-500 shadow-lg shadow-brand-500/20'
            }`}
          >
            {tracking ? <><Pause size={18} className="inline mr-1.5" /> Stop Tracking</> : <><Play size={18} className="inline mr-1.5" /> Start Tracking</>}
          </button>

          {tracking && (
            <p className="text-xs text-ink-400 mt-3 flex items-center gap-1.5">
              <Smartphone size={12} /> Keep your phone in your pocket or hand while walking
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <MapPin size={20} className="mx-auto text-brand-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{distanceKm.toFixed(2)}</p>
          <p className="text-xs text-ink-400">km distance</p>
        </div>
        <div className="card p-5 text-center">
          <Flame size={20} className="mx-auto text-coral-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{caloriesBurned}</p>
          <p className="text-xs text-ink-400">kcal burned</p>
        </div>
        <div className="card p-5 text-center">
          <Zap size={20} className="mx-auto text-lime-400 mb-2" />
          <p className="font-display text-2xl font-bold text-white">{Math.round(steps * 0.762 * 0.5)}</p>
          <p className="text-xs text-ink-400">active points</p>
        </div>
      </div>

      {/* Manual entry */}
      <div className="card p-5">
        <h3 className="font-display text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Activity size={16} className="text-brand-400" /> Manual Entry
        </h3>
        <p className="text-xs text-ink-400 mb-3">Add steps from another tracker or set your current count</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualSteps}
            onChange={(e) => setManualSteps(e.target.value)}
            placeholder="Enter step count"
            className="input flex-1"
          />
          <button onClick={handleManualAdd} className="btn-secondary text-sm">
            <Plus size={16} /> Add
          </button>
          <button onClick={handleManualSet} className="btn-ghost text-sm">
            Set
          </button>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card p-5">
        <h3 className="font-display text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-400" /> Last 7 Days
        </h3>
        {weekDays.length === 0 ? (
          <p className="text-ink-400 text-sm text-center py-8">No step data yet. Start tracking above!</p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-40">
            {weekDays.map((d, i) => {
              const s = d.steps ?? 0;
              const pct = Math.max(2, (s / maxWeekSteps) * 100);
              const isToday = d.metric_date === today;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-ink-400 tabular-nums">{s > 0 ? s.toLocaleString() : ''}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-brand-500 to-brand-400' : 'bg-ink-700'}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isToday ? 'text-brand-400 font-bold' : 'text-ink-500'}`}>
                    {new Date(d.metric_date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
