import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Utensils, Plus, Trash2, Flame, Droplets, Moon, Sun, Apple, Salad, Wheat, Coffee, Check, Settings2, Clock, Users, AlertCircle, X } from 'lucide-react';
import type { Profile, DietPreference } from '@/types';

interface MealPlan {
  id: string;
  user_id: string;
  title: string;
  content: MealPlanContent;
  created_at: string;
}

export interface MealPlanSettings {
  dietType: DietPreference;
  mealsPerDay: 2 | 3 | 4 | 5 | 6;
  calorieTarget: 'auto' | 'deficit' | 'maintenance' | 'surplus';
  customCalories: number | null;
  proteinRatio: number; // percentage of calories from protein (20-40)
  carbRatio: number;    // percentage of calories from carbs (20-60)
  fatRatio: number;    // percentage of calories from fat (15-40)
  wakeTime: string;    // "06:00"
  sleepTime: string;   // "22:00"
  allergies: string[];  // e.g. ["lactose", "gluten", "nuts"]
  excludedFoods: string[]; // specific foods to avoid
  cuisine: 'indian' | 'south-indian' | 'north-indian' | 'continental' | 'mixed';
  includeSnacks: boolean;
  preWorkoutMeal: boolean;
  postWorkoutMeal: boolean;
  intermittentFasting: boolean;
  fastingWindow: '14:10' | '16:8' | '18:6'; // fasting:eating hours
}

export interface MealPlanContent {
  summary: string;
  totalCalories: number;
  macros: { protein: number; carbs: number; fats: number };
  meals: Meal[];
  tips: string[];
  dietType: DietPreference;
  settings: MealPlanSettings;
  schedule: { name: string; time: string; type: string }[];
}

interface Meal {
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' | 'Pre-Workout' | 'Post-Workout';
  time: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const PROTEIN_SOURCES: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Chicken breast', 'Eggs', 'Curd (Greek yogurt)', 'Fish (rohu/katla)', 'Mutton (lean)', 'Paneer', 'Whey protein'],
  'vegetarian': ['Paneer', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Chickpeas (chana)', 'Soya chunks', 'Tofu', 'Whey protein'],
  'vegan': ['Tofu', 'Tempeh', 'Lentils (dal)', 'Chickpeas (chana)', 'Rajma (kidney beans)', 'Hemp seeds', 'Quinoa', 'Soy milk', 'Pea protein'],
  'pescatarian': ['Fish (rohu/katla/salmon)', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Shrimp (prawns)', 'Paneer'],
  'keto': ['Eggs', 'Chicken thigh', 'Fish (salmon)', 'Avocado', 'Cheese (paneer)', 'Mutton', 'Curd (full-fat)', 'Ghee'],
  'other': ['Chicken breast', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Tofu', 'Fish', 'Paneer'],
};

const CARB_SOURCES: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Brown rice', 'Oats', 'Sweet potato', 'Roti (whole wheat)', 'Banana', 'Quinoa', 'Idli'],
  'vegetarian': ['Brown rice', 'Oats', 'Sweet potato', 'Roti (whole wheat)', 'Banana', 'Quinoa', 'Idli', 'Dosa'],
  'vegan': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Banana', 'Roti (whole wheat)', 'Lentils (dal)'],
  'pescatarian': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Roti (whole wheat)', 'Banana'],
  'keto': ['Cauliflower rice', 'Broccoli', 'Spinach (palak)', 'Zucchini', 'Almonds (badam)', 'Avocado'],
  'other': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Roti (whole wheat)', 'Banana'],
};

const FAT_SOURCES: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee', 'Dark chocolate'],
  'vegetarian': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee', 'Dark chocolate'],
  'vegan': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Chia seeds', 'Flax seeds (alsi)'],
  'pescatarian': ['Olive oil', 'Avocado', 'Almonds (badam)', 'Fish oil (natural)', 'Walnuts (akhrot)', 'Peanut butter'],
  'keto': ['Olive oil', 'Avocado', 'Butter', 'Coconut oil', 'Cheese (paneer)', 'Almonds (badam)', 'Ghee'],
  'other': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee'],
};

const CUISINE_ITEMS: Record<string, string[]> = {
  'north-indian': ['Roti', 'Dal tadka', 'Paneer butter masala', 'Chana masala', 'Aloo gobi', 'Rajma', 'Paratha', 'Kadhi'],
  'south-indian': ['Idli', 'Dosa', 'Sambar', 'Rasam', 'Coconut chutney', 'Lemon rice', 'Curd rice', 'Upma', 'Pongal'],
  'indian': ['Roti', 'Dal', 'Sabzi', 'Curd', 'Pulao', 'Khichdi', 'Poha', 'Upma'],
  'continental': ['Oats', 'Boiled eggs', 'Grilled chicken', 'Salad', 'Whole grain bread', 'Pasta', 'Soup'],
  'mixed': ['Roti', 'Oats', 'Idli', 'Brown rice', 'Dal', 'Grilled chicken', 'Salad', 'Sweet potato'],
};

const ALLERGY_FILTERS: Record<string, string[]> = {
  lactose: ['Curd', 'Greek yogurt', 'Cheese', 'Paneer', 'Butter', 'Ghee', 'Milk'],
  gluten: ['Roti', 'Oats', 'Bread', 'Pasta', 'Dosa', 'Rava', 'Sevai'],
  nuts: ['Almonds', 'Badam', 'Walnuts', 'Akhrot', 'Peanut butter', 'Cashews'],
  eggs: ['Eggs', 'Boiled eggs', 'Omelette'],
  soy: ['Tofu', 'Soya chunks', 'Soy milk', 'Tempeh'],
  fish: ['Fish', 'Rohu', 'Katla', 'Salmon', 'Shrimp', 'Prawns'],
  pork: ['Pork', 'Bacon', 'Ham'],
  beef: ['Beef'],
};

function pick<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function filterAllergies(foods: string[], allergies: string[]): string[] {
  let result = [...foods];
  for (const allergy of allergies) {
    const filterList = ALLERGY_FILTERS[allergy] ?? [];
    result = result.filter((f) => !filterList.some((a) => f.toLowerCase().includes(a.toLowerCase())));
  }
  return result;
}

function filterExcluded(foods: string[], excluded: string[]): string[] {
  return foods.filter((f) => !excluded.some((e) => f.toLowerCase().includes(e.toLowerCase())));
}

function calculateMealTimes(settings: MealPlanSettings): { name: string; time: string; type: string }[] {
  const [wakeH, wakeM] = settings.wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = settings.sleepTime.split(':').map(Number);
  const wakeMin = wakeH * 60 + wakeM;
  const sleepMin = sleepH * 60 + sleepM;
  const awakeDuration = sleepMin > wakeMin ? sleepMin - wakeMin : (24 * 60 - wakeMin) + sleepMin;

  // Always include Breakfast, Lunch, and Dinner as core meals.
  // Then add pre/post workout and snacks based on settings and mealsPerDay budget.
  const mealTypes: string[] = [];

  // Pre-workout comes first (before breakfast or as first meal)
  if (settings.preWorkoutMeal) mealTypes.push('Pre-Workout');

  // Breakfast is always included
  mealTypes.push('Breakfast');

  // Lunch is always included
  mealTypes.push('Lunch');

  // Add snack if budget allows and snacks are enabled
  const coreCount = mealTypes.length + 1; // +1 for dinner (always included below)
  const hasBudgetForSnack = settings.mealsPerDay > coreCount && settings.includeSnacks;
  if (hasBudgetForSnack) mealTypes.push('Snack');

  // Dinner is always included
  mealTypes.push('Dinner');

  // Post-workout comes after dinner or as last meal
  if (settings.postWorkoutMeal) mealTypes.push('Post-Workout');

  // If user wants more meals than we have, add extra snacks
  while (mealTypes.length < settings.mealsPerDay) {
    mealTypes.splice(mealTypes.length - 1, 0, 'Snack');
  }

  // If user wants fewer meals than we have, remove snacks first (but never lunch/dinner)
  while (mealTypes.length > settings.mealsPerDay) {
    const snackIdx = mealTypes.indexOf('Snack');
    if (snackIdx >= 0) {
      mealTypes.splice(snackIdx, 1);
    } else {
      break; // can't remove more - keep core meals
    }
  }

  // Distribute meals evenly across waking hours
  const schedule: { name: string; time: string; type: string }[] = [];
  const interval = awakeDuration / mealTypes.length;

  for (let i = 0; i < mealTypes.length; i++) {
    const timeMin = wakeMin + Math.round(interval * (i + 0.5));
    const h = Math.floor(timeMin / 60) % 24;
    const m = timeMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    schedule.push({ name: mealTypes[i], time: timeStr, type: mealTypes[i] });
  }

  return schedule;
}

function generateMealPlan(profile: Profile, settings: MealPlanSettings): MealPlanContent {
  const diet = settings.dietType;
  const weight = Number(profile.weight_kg) || 70;

  // Calculate calorie target
  const maintenance = Math.round(weight * 33);
  let targetCalories: number;
  if (settings.customCalories && settings.customCalories > 0) {
    targetCalories = settings.customCalories;
  } else if (settings.calorieTarget === 'deficit') {
    targetCalories = Math.round(maintenance * 0.8);
  } else if (settings.calorieTarget === 'surplus') {
    targetCalories = Math.round(maintenance * 1.15);
  } else {
    targetCalories = maintenance;
  }

  // Calculate macros from ratios (protein and fat are prioritized, carbs get remainder)
  const proteinCal = Math.round(targetCalories * (settings.proteinRatio / 100));
  const fatCal = Math.round(targetCalories * (settings.fatRatio / 100));
  const carbCal = targetCalories - proteinCal - fatCal;

  const proteinG = Math.round(proteinCal / 4);
  const carbsG = Math.round(carbCal / 4);
  const fatsG = Math.round(fatCal / 9);

  // Filter food sources
  let proteinSrc = PROTEIN_SOURCES[diet] ?? PROTEIN_SOURCES['other'];
  let carbSrc = CARB_SOURCES[diet] ?? CARB_SOURCES['other'];
  let fatSrc = FAT_SOURCES[diet] ?? FAT_SOURCES['other'];
  const cuisineItems = CUISINE_ITEMS[settings.cuisine] ?? CUISINE_ITEMS['mixed'];

  proteinSrc = filterAllergies(proteinSrc, settings.allergies);
  carbSrc = filterAllergies(carbSrc, settings.allergies);
  fatSrc = filterAllergies(fatSrc, settings.allergies);
  const filteredCuisine = filterAllergies(cuisineItems, settings.allergies);

  proteinSrc = filterExcluded(proteinSrc, settings.excludedFoods);
  carbSrc = filterExcluded(carbSrc, settings.excludedFoods);
  fatSrc = filterExcluded(fatSrc, settings.excludedFoods);

  // Fallbacks if filtering removed everything
  if (proteinSrc.length === 0) proteinSrc = ['Whey protein', 'Lentils (dal)'];
  if (carbSrc.length === 0) carbSrc = ['Rice', 'Potato'];
  if (fatSrc.length === 0) fatSrc = ['Olive oil', 'Avocado'];

  // Build schedule
  const schedule = calculateMealTimes(settings);

  // Distribute calories across meals
  // Pre/post workout get smaller portions, main meals get larger
  const mealWeights = schedule.map((s) => {
    if (s.type === 'Pre-Workout' || s.type === 'Post-Workout') return 0.5;
    if (s.type === 'Snack') return 0.5;
    return 1.5;
  });
  const totalWeight = mealWeights.reduce((a, b) => a + b, 0);

  const meals: Meal[] = schedule.map((s, i) => {
    const mealCal = Math.round(targetCalories * (mealWeights[i] / totalWeight));
    const mealProtein = Math.round(proteinG * (mealWeights[i] / totalWeight));
    const mealCarbs = Math.round(carbsG * (mealWeights[i] / totalWeight));
    const mealFats = Math.round(fatsG * (mealWeights[i] / totalWeight));

    const items: string[] = [];
    const prot = pick(proteinSrc, 1)[0];
    const carb = pick(carbSrc, 1)[0];
    const fat = pick(fatSrc, 1)[0];
    const cuisine = pick(filteredCuisine, 1)[0];

    if (s.type === 'Pre-Workout') {
      items.push(`${carb} (1 serving)`, `${prot} (1 serving)`, 'Water 500ml');
    } else if (s.type === 'Post-Workout') {
      items.push(`${prot} (1.5 servings)`, `${carb} (1 serving)`, `${fat} (small portion)`);
    } else if (s.type === 'Snack') {
      items.push(`${prot} (small serving)`, `${carb} (small serving)`, 'Tea or coffee');
    } else if (s.type === 'Breakfast') {
      items.push(`${prot} (1 serving)`, `${carb} (1 serving)`, `${fat} (1 tsp)`, 'Masala chai or green tea');
    } else {
      items.push(`${prot} (150g)`, `${carb} (1.5 cups)`, `${cuisine} (1 serving)`, `${fat} (1 tbsp)`);
    }

    return {
      name: s.name,
      type: s.type as Meal['type'],
      time: s.time,
      items,
      calories: mealCal,
      protein: mealProtein,
      carbs: mealCarbs,
      fats: mealFats,
    };
  });

  const tips: string[] = [
    `Drink ${Math.round(weight * 35)}ml of water daily - that's ${((weight * 35) / 1000).toFixed(1)}L for you.`,
    'Eat protein with every meal to support muscle recovery and growth.',
    settings.preWorkoutMeal ? 'Have your pre-workout meal 60-90 minutes before training.' : 'Avoid heavy meals within 2 hours of training.',
    settings.postWorkoutMeal ? 'Have your post-workout meal within 2 hours after training for best recovery.' : 'Include a protein-rich meal after training.',
    diet === 'vegan' ? 'Take a B12 supplement - it is the one nutrient hard to get on a vegan diet.' : 'Include a variety of colorful vegetables for vitamins and antioxidants.',
    settings.intermittentFasting ? `Intermittent fasting (${settings.fastingWindow}): eat all meals within your eating window, fast for the rest.` : 'Prep ingredients in bulk on weekends to save time during the week.',
    settings.allergies.length > 0 ? `All meals are free from: ${settings.allergies.join(', ')}.` : 'Rotate protein sources throughout the week for a wider amino acid profile.',
  ];

  const calorieLabel = settings.calorieTarget === 'deficit' ? 'fat loss' : settings.calorieTarget === 'surplus' ? 'muscle gain' : 'maintenance';

  return {
    summary: `${diet.charAt(0).toUpperCase() + diet.slice(1)} ${settings.cuisine.replace('-', ' ')} meal plan for ${profile.sport.replace('_', ' ')} training - ${settings.mealsPerDay} meals/day - ${targetCalories} kcal (${calorieLabel}) - ${proteinG}g protein / ${carbsG}g carbs / ${fatsG}g fats`,
    totalCalories: targetCalories,
    macros: { protein: proteinG, carbs: carbsG, fats: fatsG },
    meals,
    tips,
    dietType: diet,
    settings,
    schedule,
  };
}

const DEFAULT_SETTINGS: MealPlanSettings = {
  dietType: 'non-vegetarian',
  mealsPerDay: 4,
  calorieTarget: 'auto',
  customCalories: null,
  proteinRatio: 30,
  carbRatio: 40,
  fatRatio: 30,
  wakeTime: '06:30',
  sleepTime: '22:30',
  allergies: [],
  excludedFoods: [],
  cuisine: 'mixed',
  includeSnacks: true,
  preWorkoutMeal: true,
  postWorkoutMeal: true,
  intermittentFasting: false,
  fastingWindow: '16:8',
};

const ALLERGY_OPTIONS = ['lactose', 'gluten', 'nuts', 'eggs', 'soy', 'fish', 'pork', 'beef'];
const CUISINE_OPTIONS = [
  { v: 'mixed', l: 'Mixed Indian' },
  { v: 'north-indian', l: 'North Indian' },
  { v: 'south-indian', l: 'South Indian' },
  { v: 'continental', l: 'Continental' },
] as const;

export function DietPage() {
  const { profile, user } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<MealPlanSettings>({
    ...DEFAULT_SETTINGS,
    dietType: profile?.diet_preference ?? 'non-vegetarian',
  });
  const [excludedInput, setExcludedInput] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('meal_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setPlans((data as MealPlan[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Sync diet type with profile
  useEffect(() => {
    if (profile?.diet_preference) {
      setSettings((s) => ({ ...s, dietType: profile.diet_preference }));
    }
  }, [profile]);

  const handleGenerate = async () => {
    if (!profile || !user) return;
    setGenerating(true);
    const content = generateMealPlan(profile, settings);
    const { data } = await supabase.from('meal_plans').insert({
      user_id: user.id,
      title: `${content.dietType.charAt(0).toUpperCase() + content.dietType.slice(1)} Plan - ${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}`,
      content,
    }).select('*').single();
    if (data) setPlans((prev) => [data as MealPlan, ...prev]);
    setGenerating(false);
    setShowSettings(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('meal_plans').delete().eq('id', id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleAllergy = (a: string) => {
    setSettings((s) => ({
      ...s,
      allergies: s.allergies.includes(a) ? s.allergies.filter((x) => x !== a) : [...s.allergies, a],
    }));
  };

  const addExcludedFood = () => {
    const food = excludedInput.trim().toLowerCase();
    if (food && !settings.excludedFoods.includes(food)) {
      setSettings((s) => ({ ...s, excludedFoods: [...s.excludedFoods, food] }));
    }
    setExcludedInput('');
  };

  const removeExcludedFood = (food: string) => {
    setSettings((s) => ({ ...s, excludedFoods: s.excludedFoods.filter((f) => f !== food) }));
  };

  // Auto-adjust macros to sum to 100
  const adjustMacro = (which: 'protein' | 'carb' | 'fat', value: number) => {
    const clamped = Math.max(10, Math.min(70, value));
    if (which === 'protein') {
      const remaining = 100 - clamped;
      const fat = Math.round(remaining * (settings.fatRatio / (settings.fatRatio + settings.carbRatio)));
      setSettings((s) => ({ ...s, proteinRatio: clamped, fatRatio: fat, carbRatio: 100 - clamped - fat }));
    } else if (which === 'fat') {
      const remaining = 100 - clamped;
      const protein = Math.round(remaining * (settings.proteinRatio / (settings.proteinRatio + settings.carbRatio)));
      setSettings((s) => ({ ...s, fatRatio: clamped, proteinRatio: protein, carbRatio: 100 - clamped - protein }));
    } else {
      const remaining = 100 - clamped;
      const protein = Math.round(remaining * (settings.proteinRatio / (settings.proteinRatio + settings.fatRatio)));
      setSettings((s) => ({ ...s, carbRatio: clamped, proteinRatio: protein, fatRatio: 100 - clamped - protein }));
    }
  };

  if (loading) return <div className="text-ink-300">Loading diet plans...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Diet Plans</h1>
          <p className="text-ink-300 text-sm mt-1">
            AI-generated meal plans tailored to your diet, schedule, and goals
            {profile?.diet_preference && profile.diet_preference !== 'non-vegetarian' && (
              <span className="text-brand-400 font-medium"> ({profile.diet_preference})</span>
            )}
          </p>
        </div>
        <button onClick={() => setShowSettings(true)} className="btn-primary text-sm">
          <Settings2 size={16} /> Meal Plan Settings
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="card p-12 text-center">
          <Utensils size={40} className="mx-auto text-ink-500 mb-4" />
          <h3 className="font-display text-lg font-bold text-white mb-2">No diet plans yet</h3>
          <p className="text-ink-300 mb-6 max-w-md mx-auto">
            Configure your meal plan settings - diet type, number of meals, calorie target, meal timings,
            allergies, cuisine preference, and more. Then generate a personalized plan.
          </p>
          <button onClick={() => setShowSettings(true)} className="btn-primary">
            <Settings2 size={18} /> Configure & Generate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const c = plan.content;
            return (
              <div key={plan.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-white">{plan.title}</h3>
                    <p className="text-sm text-ink-300 mt-1">{c.summary}</p>
                  </div>
                  <button onClick={() => handleDelete(plan.id)} className="text-ink-500 hover:text-coral-400 transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Settings badges */}
                {c.settings && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="chip bg-ink-700/40 text-ink-300 text-xs capitalize">{c.settings.dietType}</span>
                    <span className="chip bg-ink-700/40 text-ink-300 text-xs">{c.settings.mealsPerDay} meals</span>
                    <span className="chip bg-ink-700/40 text-ink-300 text-xs capitalize">{c.settings.cuisine.replace('-', ' ')}</span>
                    {c.settings.preWorkoutMeal && <span className="chip bg-brand-500/10 text-brand-400 text-xs">Pre-workout</span>}
                    {c.settings.postWorkoutMeal && <span className="chip bg-brand-500/10 text-brand-400 text-xs">Post-workout</span>}
                    {c.settings.intermittentFasting && <span className="chip bg-lime-500/10 text-lime-400 text-xs">IF {c.settings.fastingWindow}</span>}
                    {c.settings.allergies.map((a) => (
                      <span key={a} className="chip bg-coral-500/10 text-coral-400 text-xs">No {a}</span>
                    ))}
                  </div>
                )}

                {/* Macro summary */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                    <Flame size={16} className="mx-auto text-coral-400 mb-1" />
                    <p className="font-display text-lg font-bold text-white">{c.totalCalories}</p>
                    <p className="text-xs text-ink-400">kcal/day</p>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                    <Wheat size={16} className="mx-auto text-brand-400 mb-1" />
                    <p className="font-display text-lg font-bold text-white">{c.macros.protein}g</p>
                    <p className="text-xs text-ink-400">Protein</p>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                    <Apple size={16} className="mx-auto text-lime-400 mb-1" />
                    <p className="font-display text-lg font-bold text-white">{c.macros.carbs}g</p>
                    <p className="text-xs text-ink-400">Carbs</p>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-800/50 text-center">
                    <Droplets size={16} className="mx-auto text-yellow-400 mb-1" />
                    <p className="font-display text-lg font-bold text-white">{c.macros.fats}g</p>
                    <p className="text-xs text-ink-400">Fats</p>
                  </div>
                </div>

                {/* Meals with times */}
                <div className="space-y-3">
                  {c.meals.map((meal, i) => {
                    const Icon = meal.type === 'Breakfast' ? Sun : meal.type === 'Lunch' ? Utensils : meal.type === 'Snack' ? Apple : meal.type === 'Pre-Workout' ? Flame : meal.type === 'Post-Workout' ? Check : Moon;
                    return (
                      <div key={i} className="p-3.5 rounded-xl bg-ink-800/40 border border-ink-700/40">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-brand-400" />
                            <span className="text-sm font-semibold text-white">{meal.name}</span>
                            {meal.time && (
                              <span className="text-xs text-ink-400 flex items-center gap-1">
                                <Clock size={11} /> {meal.time}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-ink-400">{meal.calories} kcal · P{meal.protein}g C{meal.carbs}g F{meal.fats}g</span>
                        </div>
                        <ul className="space-y-1">
                          {meal.items.map((item, j) => (
                            <li key={j} className="text-sm text-ink-300 flex items-start gap-2">
                              <Check size={14} className="text-brand-400 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* Tips */}
                <div className="mt-4 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <p className="text-sm font-semibold text-brand-300 mb-2 flex items-center gap-1.5"><Salad size={14} /> Coach Tips</p>
                  <ul className="space-y-1.5">
                    {c.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-brand-200/80 flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5">-</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Meal Plan Settings" size="lg">
        {generating ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Spinner className="text-brand-400" size={32} />
            <p className="text-ink-300">Generating your personalized meal plan...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-ink-300 text-sm">
              Configure your preferences below. Your AI coach will create a meal plan that respects all these settings.
            </p>

            {/* Diet Type */}
            <div>
              <label className="label">Diet Type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'non-vegetarian', l: 'Non-Veg' },
                  { v: 'vegetarian', l: 'Vegetarian' },
                  { v: 'vegan', l: 'Vegan' },
                  { v: 'pescatarian', l: 'Pescatarian' },
                  { v: 'keto', l: 'Keto' },
                  { v: 'other', l: 'Other' },
                ] as { v: DietPreference; l: string }[]).map((d) => (
                  <button key={d.v} onClick={() => setSettings((s) => ({ ...s, dietType: d.v }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${settings.dietType === d.v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine */}
            <div>
              <label className="label">Cuisine Preference</label>
              <div className="grid grid-cols-4 gap-2">
                {CUISINE_OPTIONS.map((c) => (
                  <button key={c.v} onClick={() => setSettings((s) => ({ ...s, cuisine: c.v }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${settings.cuisine === c.v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                    {c.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Meals per day */}
            <div>
              <label className="label flex items-center gap-2"><Users size={14} /> Meals per day: <span className="text-brand-400 font-bold">{settings.mealsPerDay}</span></label>
              <div className="grid grid-cols-5 gap-2">
                {([2, 3, 4, 5, 6] as const).map((n) => (
                  <button key={n} onClick={() => setSettings((s) => ({ ...s, mealsPerDay: n }))}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${settings.mealsPerDay === n ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300 hover:border-ink-600'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal timing options */}
            <div>
              <label className="label flex items-center gap-2"><Clock size={14} /> Meal Timing</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-ink-400">Wake time</span>
                  <input type="time" value={settings.wakeTime} onChange={(e) => setSettings((s) => ({ ...s, wakeTime: e.target.value }))} className="input" />
                </div>
                <div>
                  <span className="text-xs text-ink-400">Sleep time</span>
                  <input type="time" value={settings.sleepTime} onChange={(e) => setSettings((s) => ({ ...s, sleepTime: e.target.value }))} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => setSettings((s) => ({ ...s, preWorkoutMeal: !s.preWorkoutMeal }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${settings.preWorkoutMeal ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-400'}`}>
                  <Flame size={14} className="inline mr-1" /> Pre-workout meal
                </button>
                <button onClick={() => setSettings((s) => ({ ...s, postWorkoutMeal: !s.postWorkoutMeal }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${settings.postWorkoutMeal ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-400'}`}>
                  <Check size={14} className="inline mr-1" /> Post-workout meal
                </button>
                <button onClick={() => setSettings((s) => ({ ...s, includeSnacks: !s.includeSnacks }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${settings.includeSnacks ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-400'}`}>
                  <Apple size={14} className="inline mr-1" /> Include snacks
                </button>
                <button onClick={() => setSettings((s) => ({ ...s, intermittentFasting: !s.intermittentFasting }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${settings.intermittentFasting ? 'border-lime-500 bg-lime-500/10 text-lime-400' : 'border-ink-700 bg-ink-800/50 text-ink-400'}`}>
                  <Moon size={14} className="inline mr-1" /> Intermittent fasting
                </button>
              </div>
              {settings.intermittentFasting && (
                <div className="mt-2">
                  <span className="text-xs text-ink-400">Fasting window (fast:eat hours)</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {(['14:10', '16:8', '18:6'] as const).map((w) => (
                      <button key={w} onClick={() => setSettings((s) => ({ ...s, fastingWindow: w }))}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${settings.fastingWindow === w ? 'border-lime-500 bg-lime-500/10 text-lime-400' : 'border-ink-700 bg-ink-800/50 text-ink-300'}`}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calorie target */}
            <div>
              <label className="label flex items-center gap-2"><Flame size={14} /> Calorie Target</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { v: 'auto', l: 'Auto' },
                  { v: 'deficit', l: 'Fat Loss' },
                  { v: 'maintenance', l: 'Maintain' },
                  { v: 'surplus', l: 'Muscle Gain' },
                ] as const).map((o) => (
                  <button key={o.v} onClick={() => setSettings((s) => ({ ...s, calorieTarget: o.v, customCalories: null }))}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${settings.calorieTarget === o.v && !settings.customCalories ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-ink-700 bg-ink-800/50 text-ink-300'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <span className="text-xs text-ink-400">Or set custom calories (0 = auto)</span>
                <input type="number" value={settings.customCalories ?? ''} onChange={(e) => setSettings((s) => ({ ...s, customCalories: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="e.g. 2200" className="input" />
              </div>
            </div>

            {/* Macro ratios */}
            <div>
              <label className="label">Macro Ratios (must total 100%)</label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-brand-400 font-medium">Protein {settings.proteinRatio}%</span>
                  </div>
                  <input type="range" min={10} max={50} value={settings.proteinRatio} onChange={(e) => adjustMacro('protein', Number(e.target.value))} className="w-full accent-brand-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-lime-400 font-medium">Carbs {settings.carbRatio}%</span>
                  </div>
                  <input type="range" min={10} max={70} value={settings.carbRatio} onChange={(e) => adjustMacro('carb', Number(e.target.value))} className="w-full accent-lime-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-yellow-400 font-medium">Fats {settings.fatRatio}%</span>
                  </div>
                  <input type="range" min={10} max={50} value={settings.fatRatio} onChange={(e) => adjustMacro('fat', Number(e.target.value))} className="w-full accent-yellow-500" />
                </div>
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="label flex items-center gap-2"><AlertCircle size={14} /> Allergies & Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((a) => (
                  <button key={a} onClick={() => toggleAllergy(a)}
                    className={`chip border capitalize transition-all ${settings.allergies.includes(a) ? 'bg-coral-500/20 border-coral-500/40 text-coral-400' : 'bg-ink-800/50 border-ink-700 text-ink-300'}`}>
                    {settings.allergies.includes(a) && <Check size={12} />} {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Excluded foods */}
            <div>
              <label className="label">Exclude Specific Foods</label>
              <div className="flex gap-2">
                <input type="text" value={excludedInput} onChange={(e) => setExcludedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExcludedFood()}
                  placeholder="e.g. broccoli, cottage cheese" className="input flex-1" />
                <button onClick={addExcludedFood} className="btn-secondary text-sm">
                  <Plus size={16} /> Add
                </button>
              </div>
              {settings.excludedFoods.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {settings.excludedFoods.map((f) => (
                    <span key={f} className="chip bg-coral-500/10 text-coral-400 text-xs capitalize flex items-center gap-1">
                      {f} <button onClick={() => removeExcludedFood(f)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleGenerate} className="btn-primary w-full text-base py-3.5">
              <Plus size={18} /> Generate Meal Plan
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
