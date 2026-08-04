import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { SPORTS, FITNESS_LEVELS, EQUIPMENT_OPTIONS, GOAL_OPTIONS, type Sport, type FitnessLevel, type DietPreference } from '@/types';
import { Save, Check, ArrowLeft, User as UserIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [sport, setSport] = useState<Sport>(profile?.sport ?? 'general_fitness');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '');
  const [level, setLevel] = useState<FitnessLevel>(profile?.fitness_level ?? 'beginner');
  const [experience, setExperience] = useState(profile?.experience_years?.toString() ?? '');
  const [goals, setGoals] = useState<string[]>(profile?.goals ?? []);
  const [equipment, setEquipment] = useState<string[]>(profile?.available_equipment ?? []);
  const [daysPerWeek, setDaysPerWeek] = useState(profile?.training_days_per_week ?? 3);
  const [preferredTime, setPreferredTime] = useState(profile?.preferred_time ?? 'morning');
  const [injuries, setInjuries] = useState(profile?.injuries ?? '');
  const [diet, setDiet] = useState<DietPreference>(profile?.diet_preference ?? 'non-vegetarian');

  const toggle = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').upsert({
      id: user.id,
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
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-lime-500 flex items-center justify-center">
          <UserIcon size={28} className="text-ink-950" />
        </div>
        <div>
          <h1 className="section-title">Athlete Profile</h1>
          <p className="text-ink-300 text-sm">Update your details to refine AI-generated plans</p>
        </div>
      </div>

      {profile?.bmi && (
        <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm">
          <span className="text-ink-300">Your BMI: </span>
          <span className="font-bold text-brand-400">{profile.bmi}</span>
          <span className="text-ink-400 ml-2">({profile.bmi < 18.5 ? 'Underweight' : profile.bmi < 25 ? 'Healthy' : profile.bmi < 30 ? 'Overweight' : 'Obese'})</span>
        </div>
      )}

      <div className="card p-6 space-y-5">
        {/* Basic info */}
        <div>
          <label className="label">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
        </div>

        <div>
          <label className="label">Primary Sport</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORTS.map((s) => (
              <button key={s.value} onClick={() => setSport(s.value)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${sport === s.value ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Fitness Level</label>
          <div className="grid grid-cols-2 gap-2">
            {FITNESS_LEVELS.map((l) => (
              <button key={l.value} onClick={() => setLevel(l.value)}
                className={`p-3 rounded-xl border text-left transition-all ${level === l.value ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-800/50 hover:border-ink-600'}`}>
                <span className={`block text-sm font-semibold ${level === l.value ? 'text-brand-400' : 'text-white'}`}>{l.label}</span>
                <span className="block text-xs text-ink-400">{l.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Experience (years)</label>
            <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Training Days/Week: <span className="text-brand-400 font-bold">{daysPerWeek}</span></label>
            <input type="range" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} className="w-full accent-brand-500 mt-3" />
          </div>
        </div>

        <div>
          <label className="label">Preferred Time</label>
          <div className="grid grid-cols-4 gap-2">
            {(['morning', 'afternoon', 'evening', 'flexible'] as const).map((t) => (
              <button key={t} onClick={() => setPreferredTime(t)}
                className={`p-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${preferredTime === t ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Goals</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button key={g} onClick={() => toggle(goals, g, setGoals)}
                className={`chip border transition-all ${goals.includes(g) ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'bg-ink-800/50 border-ink-700 text-ink-300'}`}>
                {goals.includes(g) && <Check size={12} />} {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Available Equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button key={eq} onClick={() => toggle(equipment, eq, setEquipment)}
                className={`chip border transition-all ${equipment.includes(eq) ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-ink-800/50 border-ink-700 text-ink-300'}`}>
                {equipment.includes(eq) && <Check size={12} />} {eq}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Injuries or Limitations</label>
          <input value={injuries} onChange={(e) => setInjuries(e.target.value)} className="input" placeholder="e.g., mild knee pain" />
        </div>

        <div>
          <label className="label">Diet Preference</label>
          <p className="text-xs text-ink-400 mb-2">Your AI coach and diet plans will respect this choice</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { v: 'non-vegetarian', l: 'Non-Veg' },
              { v: 'vegetarian', l: 'Vegetarian' },
              { v: 'vegan', l: 'Vegan' },
              { v: 'pescatarian', l: 'Pescatarian' },
              { v: 'keto', l: 'Keto' },
              { v: 'other', l: 'Other' },
            ] as { v: DietPreference; l: string }[]).map((d) => (
              <button key={d.v} onClick={() => setDiet(d.v)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${diet === d.v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? <Spinner size={18} /> : saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Profile</>}
        </button>
      </div>
    </div>
  );
}
