import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { SPORTS, FITNESS_LEVELS, EQUIPMENT_OPTIONS, GOAL_OPTIONS, type Sport, type FitnessLevel, type DietPreference } from '@/types';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

const DIET_OPTIONS: { value: DietPreference; label: string; desc: string }[] = [
  { value: 'non-vegetarian', label: 'Non-Vegetarian', desc: 'Meat, fish, dairy, eggs' },
  { value: 'vegetarian', label: 'Vegetarian', desc: 'No meat or fish' },
  { value: 'vegan', label: 'Vegan', desc: 'No animal products' },
  { value: 'pescatarian', label: 'Pescatarian', desc: 'Fish, no other meat' },
  { value: 'keto', label: 'Keto', desc: 'High fat, very low carb' },
  { value: 'other', label: 'Other / Flexible', desc: 'Flexible or unlisted' },
];

const STEPS = ['Sport', 'About You', 'Goals', 'Diet & Schedule'];

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sport, setSport] = useState<Sport>('general_fitness');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [experience, setExperience] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState('');
  const [diet, setDiet] = useState<DietPreference>('non-vegetarian');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>('morning');

  const toggle = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const canProceed = () => {
    if (step === 1) return fullName.trim() && age && height && weight;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: upErr } = await supabase.from('profiles').upsert({
      id: user!.id,
      full_name: fullName.trim(),
      sport,
      age: Number(age) || null,
      height_cm: Number(height) || null,
      weight_kg: Number(weight) || null,
      fitness_level: level,
      experience_years: Number(experience) || 0,
      goals,
      available_equipment: equipment,
      training_days_per_week: daysPerWeek,
      preferred_time: preferredTime,
      injuries: injuries.trim() || null,
      diet_preference: diet,
    });
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    await refreshProfile();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="/image copy.png" alt="TrainX" className="h-10 w-10 rounded-xl object-cover" />
            <span className="font-display text-xl font-bold text-white">TrainX</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Build Your Athlete Profile</h1>
          <p className="text-ink-300 text-sm mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-10 bg-brand-500' : i < step ? 'w-6 bg-brand-600' : 'w-6 bg-ink-600'}`}
            />
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-coral-500/10 border border-coral-500/20 text-coral-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 0: Sport */}
          {step === 0 && (
            <div className="animate-fade-in space-y-4">
              <p className="text-ink-200 text-sm">What sport do you want to train for?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SPORTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSport(s.value)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      sport === s.value
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${sport === s.value ? 'text-brand-400' : 'text-white'}`}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: About You */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="Alex Carter" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Age</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input" placeholder="25" />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="input" placeholder="175" />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="input" placeholder="72" />
                </div>
              </div>
              {height && weight && (
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm">
                  <span className="text-ink-300">Your BMI: </span>
                  <span className="font-bold text-brand-400">
                    {(Number(weight) / (Number(height) / 100) ** 2).toFixed(1)}
                  </span>
                </div>
              )}
              <div>
                <label className="label">Fitness Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {FITNESS_LEVELS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${level === l.value ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'}`}
                    >
                      <span className={`block text-sm font-semibold ${level === l.value ? 'text-brand-400' : 'text-white'}`}>{l.label}</span>
                      <span className="block text-xs text-ink-400 mt-0.5">{l.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="input" placeholder="3" />
              </div>
              <div>
                <label className="label">Injuries or Limitations (optional)</label>
                <input value={injuries} onChange={(e) => setInjuries(e.target.value)} className="input" placeholder="e.g., mild knee pain" />
              </div>
            </div>
          )}

          {/* Step 2: Goals + Equipment */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <label className="label">Training Goals (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => toggle(goals, g, setGoals)}
                      className={`chip border transition-all ${goals.includes(g) ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-ink-800/50 border-ink-700 text-ink-300 hover:border-ink-600'}`}
                    >
                      {goals.includes(g) && <Check size={12} />}
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Available Equipment (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => toggle(equipment, eq, setEquipment)}
                      className={`chip border transition-all ${equipment.includes(eq) ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-ink-800/50 border-ink-700 text-ink-300 hover:border-ink-600'}`}
                    >
                      {equipment.includes(eq) && <Check size={12} />}
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Diet & Schedule */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <label className="label">Diet Preference</label>
                <p className="text-xs text-ink-400 mb-2">Your AI coach and meal plans will respect this choice</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIET_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDiet(d.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${diet === d.value ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'}`}
                    >
                      <span className={`block text-sm font-semibold ${diet === d.value ? 'text-brand-400' : 'text-white'}`}>{d.label}</span>
                      <span className="block text-xs text-ink-400 mt-0.5">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Training Days per Week: <span className="text-brand-400 font-bold">{daysPerWeek}</span></label>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-ink-400 mt-1">
                  <span>1 day</span><span>7 days</span>
                </div>
              </div>
              <div>
                <label className="label">Preferred Training Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['morning', 'afternoon', 'evening', 'flexible'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPreferredTime(t)}
                      className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${preferredTime === t ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
              className="btn-ghost"
            >
              <ArrowLeft size={18} />
              {step === 0 ? 'Home' : 'Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Start Training'}
                {!saving && <Check size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
