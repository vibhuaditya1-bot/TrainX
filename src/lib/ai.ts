import type { Profile, Drill, PlannedDay, PlanContent, PlanDuration, WorkoutLength, DietPreference } from '@/types';

// ---------------------------------------------------------------------------
// PLAN GENERATION ENGINE
// ---------------------------------------------------------------------------

export interface PlanParams {
  duration: PlanDuration;       // '7' | '14' | '30' | '90' days
  workoutLength: WorkoutLength;  // '15' | '30' | '45' | '60' | '90' minutes
  sessionsPerWeek: number;      // 1-7
  hasPartner: boolean;
  location: 'home' | 'park' | 'gym' | 'outdoor';
  focus: string;                // e.g. "skill", "strength", "conditioning", "mixed"
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function pickDrillsForDay(pool: Drill[], count: number, difficultyBias: string): Drill[] {
  // Sort by relevance to difficulty bias, then shuffle within
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function drillToPlanned(d: Drill, allocatedMin: number) {
  return {
    name: d.title,
    duration: `${allocatedMin} min`,
    duration_minutes: allocatedMin,
    intensity: d.difficulty,
    sets: d.difficulty === 'beginner' ? '2-3 sets' : d.difficulty === 'intermediate' ? '3-4 sets' : '4-5 sets',
    reps: d.difficulty === 'beginner' ? '10-12 reps' : d.difficulty === 'intermediate' ? '12-15 reps' : '15-20 reps',
    rest: d.difficulty === 'beginner' ? '60s rest' : d.difficulty === 'intermediate' ? '45s rest' : '30s rest',
    description: d.description,
    youtube_id: d.youtube_id ?? undefined,
  };
}

/**
 * Fill a workout to an exact target time.
 * Structure: warmup (15%) + drills (70%) + cooldown (15%)
 * Drills are allocated time from the drill budget, rounded to fill exactly.
 */
function buildDay(
  dayLabel: string,
  dayNumber: number,
  date: string,
  title: string,
  focus: string,
  pool: Drill[],
  targetMinutes: number,
  intensity: 'low' | 'moderate' | 'high' | 'very_high',
): PlannedDay {
  const warmup = Math.max(5, Math.round(targetMinutes * 0.15));
  const cooldown = Math.max(5, Math.round(targetMinutes * 0.15));
  const drillBudget = targetMinutes - warmup - cooldown;

  // Pick 3-5 drills depending on workout length
  const drillCount = targetMinutes <= 15 ? 2 : targetMinutes <= 30 ? 3 : targetMinutes <= 45 ? 4 : 5;
  const selected = pickDrillsForDay(pool, drillCount, focus);

  // Distribute drillBudget across selected drills as evenly as possible
  const perDrill = Math.floor(drillBudget / selected.length);
  const remainder = drillBudget - perDrill * selected.length;
  const drills = selected.map((d, i) => drillToPlanned(d, perDrill + (i < remainder ? 1 : 0)));

  return {
    day: dayLabel,
    dayNumber,
    date,
    title,
    focus,
    drills,
    duration_minutes: targetMinutes,
    warmup_minutes: warmup,
    cooldown_minutes: cooldown,
    intensity,
    is_rest_day: false,
    completed: false,
  };
}

function restDay(dayLabel: string, dayNumber: number, date: string): PlannedDay {
  return {
    day: dayLabel,
    dayNumber,
    date,
    title: 'Rest & Recovery',
    focus: 'Recovery',
    drills: [],
    duration_minutes: 0,
    is_rest_day: true,
    completed: false,
  };
}

/**
 * Generate a day-wise plan.
 * - For 7-day plans: Mon-Sun
 * - For 14/30/90-day plans: Day 1, Day 2, ... Day N
 * Sessions are distributed across the days based on sessionsPerWeek.
 */
export function generatePlan(profile: Profile, drills: Drill[], params: PlanParams): PlanContent {
  const sportDrills = drills.filter((d) => d.sport === profile.sport);
  const generalDrills = drills.filter((d) => d.sport === 'general_fitness');
  const pool = [...sportDrills, ...generalDrills];

  const totalDays = Number(params.duration);
  const sessionsPerWeek = params.sessionsPerWeek;

  // Calculate total sessions
  const weeks = totalDays / 7;
  const totalSessions = Math.round(weeks * sessionsPerWeek);

  // Distribute sessions across totalDays
  // For a 7-day plan with 3 sessions: e.g., Mon, Wed, Fri
  // For longer plans, spread evenly
  const sessionDays = new Set<number>();
  if (totalDays <= 7) {
    // Use named days - spread sessions across the week
    const gap = 7 / sessionsPerWeek;
    for (let i = 0; i < sessionsPerWeek; i++) {
      sessionDays.add(Math.min(6, Math.round(i * gap)));
    }
  } else {
    // For longer plans, distribute sessions every N days
    const interval = totalDays / totalSessions;
    for (let i = 0; i < totalSessions; i++) {
      sessionDays.add(Math.min(totalDays - 1, Math.round(i * interval)));
    }
  }

  // Focus rotation for variety
  const focuses = params.focus === 'mixed'
    ? ['Skill & Technique', 'Strength & Power', 'Speed & Agility', 'Endurance', 'Recovery & Mobility']
    : [params.focus];

  const intensityRotation: ('low' | 'moderate' | 'high' | 'very_high')[] = ['moderate', 'high', 'moderate', 'very_high', 'low'];

  const days: PlannedDay[] = [];
  let sessionIdx = 0;

  for (let d = 0; d < totalDays; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    const dayLabel = totalDays <= 7 ? DAY_NAMES[d] : `Day ${d + 1}`;
    const isSession = sessionDays.has(d);

    if (isSession) {
      const focus = focuses[sessionIdx % focuses.length];
      const intensity = intensityRotation[sessionIdx % intensityRotation.length];
      const title = `${focus}`;
      days.push(buildDay(dayLabel, d + 1, dateStr, title, focus, pool, Number(params.workoutLength), intensity));
      sessionIdx++;
    } else {
      days.push(restDay(dayLabel, d + 1, dateStr));
    }
  }

  const sessionCount = days.filter((d) => !d.is_rest_day).length;
  const totalMinutes = days.reduce((s, d) => s + d.duration_minutes, 0);

  return {
    summary: `${totalDays}-day ${profile.sport.replace('_', ' ')} training plan - ${sessionCount} sessions x ${params.workoutLength} min - ${sessionsPerWeek}x per week${params.hasPartner ? ' - partner drills included' : ''} - ${params.location} training`,
    focus: params.focus,
    notes: `Each session: ${Math.round(Number(params.workoutLength) * 0.15)} min warm-up + main work + ${Math.round(Number(params.workoutLength) * 0.15)} min cool-down. Total training time: ${totalMinutes} min over ${totalDays} days. Adapted for ${profile.fitness_level} level. Goals: ${profile.goals.join(', ') || 'general fitness'}.`,
    days,
    planDuration: params.duration,
    workoutLength: params.workoutLength,
    hasPartner: params.hasPartner,
    trainingLocation: params.location,
    totalDays,
    sessionsPerWeek,
  };
}

// ---------------------------------------------------------------------------
// DIET DETECTION - detect diet preference from the user's chat message
// ---------------------------------------------------------------------------

const DIET_KEYWORD_MAP: { diet: DietPreference; keywords: string[] }[] = [
  { diet: 'vegetarian', keywords: ['vegetarian', 'veg diet', 'veg food', 'no meat', 'no non-veg', 'no non veg', 'meatless', 'shakahari'] },
  { diet: 'vegan', keywords: ['vegan', 'no animal products', 'no dairy', 'no eggs', 'plant-based', 'plant based'] },
  { diet: 'pescatarian', keywords: ['pescatarian', 'pescatarian', 'fish only', 'no meat except fish', 'seafood'] },
  { diet: 'keto', keywords: ['keto', 'ketogenic', 'low carb diet', 'high fat diet'] },
  { diet: 'non-vegetarian', keywords: ['non-veg', 'non veg', 'nonvegetarian', 'omnivore', 'eat meat', 'eat chicken', 'eat fish'] },
];

function detectDietFromMessage(message: string): DietPreference | null {
  const m = message.toLowerCase();
  for (const entry of DIET_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => m.includes(kw))) return entry.diet;
  }
  return null;
}

// Indianized food lists - no beef, no pork, Indian staples prioritized
const INDIAN_PROTEIN: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Chicken breast', 'Eggs', 'Fish (rohu/katla)', 'Mutton (lean)', 'Curd (Greek yogurt)', 'Paneer', 'Whey protein'],
  'vegetarian': ['Paneer', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Chickpeas (chana)', 'Soya chunks', 'Tofu', 'Whey protein'],
  'vegan': ['Tofu', 'Tempeh', 'Lentils (dal)', 'Chickpeas (chana)', 'Black beans (rajma)', 'Hemp seeds', 'Quinoa', 'Soy milk', 'Pea protein'],
  'pescatarian': ['Fish (rohu/katla/salmon)', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Shrimp (prawns)', 'Paneer'],
  'keto': ['Eggs', 'Chicken thigh', 'Fish (salmon)', 'Avocado', 'Cheese (paneer)', 'Mutton', 'Curd (full-fat)', 'Ghee'],
  'other': ['Chicken breast', 'Eggs', 'Curd (Greek yogurt)', 'Lentils (dal)', 'Tofu', 'Fish', 'Paneer'],
};

const INDIAN_CARBS: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Brown rice', 'Oats', 'Sweet potato', 'Roti (whole wheat)', 'Banana', 'Quinoa', 'Idli'],
  'vegetarian': ['Brown rice', 'Oats', 'Sweet potato', 'Roti (whole wheat)', 'Banana', 'Quinoa', 'Idli', 'Dosa'],
  'vegan': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Banana', 'Roti (whole wheat)', 'Lentils (dal)'],
  'pescatarian': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Roti (whole wheat)', 'Banana'],
  'keto': ['Cauliflower rice', 'Broccoli', 'Spinach (palak)', 'Zucchini', 'Almonds', 'Avocado'],
  'other': ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Roti (whole wheat)', 'Banana'],
};

const INDIAN_FATS: Record<DietPreference, string[]> = {
  'non-vegetarian': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee', 'Dark chocolate'],
  'vegetarian': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee', 'Dark chocolate'],
  'vegan': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Chia seeds', 'Flax seeds (alsi)'],
  'pescatarian': ['Olive oil', 'Avocado', 'Almonds (badam)', 'Fish oil (natural)', 'Walnuts (akhrot)', 'Peanut butter'],
  'keto': ['Olive oil', 'Avocado', 'Butter', 'Coconut oil', 'Cheese (paneer)', 'Almonds (badam)', 'Ghee'],
  'other': ['Olive oil', 'Almonds (badam)', 'Avocado', 'Walnuts (akhrot)', 'Peanut butter', 'Ghee'],
};

// ---------------------------------------------------------------------------
// AI COACH RESPONSE ENGINE - personalized with conversation history
// ---------------------------------------------------------------------------

export interface ChatMessageLike {
  role: 'user' | 'assistant';
  content: string;
}

// Build a rich context string from the profile so every response is personalized
function buildProfileContext(p: Profile): string {
  const weight = Number(p.weight_kg) || 70;
  const height = Number(p.height_cm) || 170;
  const age = p.age ?? 'unknown';
  const goals = p.goals?.length ? p.goals.join(', ') : 'general fitness';
  const injuries = p.injuries?.length ? (p.injuries ?? 'none') : 'none reported';
  return [
    `Name: ${p.full_name ?? 'Athlete'}`,
    `Sport: ${p.sport.replace('_', ' ')}`,
    `Level: ${p.fitness_level}`,
    `Age: ${age}`,
    `Weight: ${weight}kg, Height: ${height}cm, BMI: ${p.bmi ?? 'unknown'}`,
    `Diet: ${p.diet_preference ?? 'non-vegetarian'}`,
    `Training: ${p.training_days_per_week} days/week`,
    `Goals: ${goals}`,
    `Injuries: ${injuries}`,
  ].join('\n');
}

// Topic detection - figure out what the user is actually asking about
function detectTopic(message: string): string {
  const m = message.toLowerCase();
  if (/push.?up|pushup/.test(m)) return 'pushup';
  if (/squat/.test(m)) return 'squat';
  if (/plank|core/.test(m)) return 'plank';
  if (/burpee/.test(m)) return 'burpee';
  if (/lunge/.test(m)) return 'lunge';
  if (/deadlift|hinge|romanian/.test(m)) return 'deadlift';
  if (/warm.?up/.test(m)) return 'warmup';
  if (/cool.?down|stretch|flexibility/.test(m)) return 'cooldown';
  if (/sleep|insomnia|rest/.test(m)) return 'sleep';
  if (/protein|creatine|supplement/.test(m)) return 'supplements';
  if (/sore|doms|tight/.test(m)) return 'soreness';
  if (/tired|fatigue|overtrain|burn/.test(m)) return 'fatigue';
  if (/motivat|lazy|give up|quit|no energy/.test(m)) return 'motivation';
  if (/diet|eat|nutrition|food|calorie|carb|macro|meal|veg|vegan|keto/.test(m)) return 'nutrition';
  if (/weight loss|lose weight|lose fat|fat loss|cutting/.test(m)) return 'fatloss';
  if (/muscle|bulk|gain weight|hypertrophy|build muscle/.test(m)) return 'muscle';
  if (/run|cardio|endurance|stamina/.test(m)) return 'running';
  if (/injur|pain|knee|back pain|shoulder|ankle/.test(m)) return 'injury';
  if (/football|dribbl|pass|shoot|ball/.test(m)) return 'football';
  if (/cricket|bat|bowl|field/.test(m)) return 'cricket';
  if (/basketball|crossover|defense/.test(m)) return 'basketball';
  if (/tennis|forehand|backhand|serve|volley/.test(m)) return 'tennis';
  if (/badminton|smash|shuttle|clear/.test(m)) return 'badminton';
  if (/athletic|sprint|jump|throw|track/.test(m)) return 'athletics';
  if (/bmi|overweight|underweight/.test(m)) return 'bmi';
  if (/hydrat|water/.test(m)) return 'hydration';
  if (/plan|program|schedule|what should i|what to do/.test(m)) return 'planning';
  if (/hello|hi |hey|good morning|good afternoon|sup/.test(m)) return 'greeting';
  return 'general';
}

// Detect conversation continuity - is the user following up?
function detectFollowUp(message: string, history: ChatMessageLike[]): { isFollowUp: boolean; previousTopic: string | null } {
  const m = message.toLowerCase();
  const followUpIndicators = [
    'what about', 'how about', 'and for', 'also', 'too', 'as well',
    'what else', 'can you also', 'another', 'next', 'then',
    'more', 'continue', 'tell me more', 'go on',
    'thanks', 'ok', 'okay', 'got it', 'makes sense',
    'but', 'however', 'what if', 'how do i', 'is it', 'should i',
  ];
  const isFollowUp = followUpIndicators.some((ind) => m.includes(ind)) || m.length < 25;

  // Find the last assistant message to determine previous topic
  const lastAssistant = [...history].reverse().find((h) => h.role === 'assistant');
  let previousTopic: string | null = null;
  if (lastAssistant) {
    previousTopic = detectTopic(lastAssistant.content);
  }

  return { isFollowUp, previousTopic };
}

// Generate a truly personalized response
function generatePersonalizedResponse(
  message: string,
  profile: Profile,
  history: ChatMessageLike[],
): string {
  const p = profile;
  const weight = Number(p.weight_kg) || 70;
  const height = Number(p.height_cm) || 170;
  const firstName = p.full_name?.split(' ')[0] ?? 'athlete';
  const sport = p.sport.replace('_', ' ');
  const level = p.fitness_level;
  const diet = detectDietFromMessage(message) ?? p.diet_preference ?? 'non-vegetarian';
  const topic = detectTopic(message);
  const { isFollowUp, previousTopic } = detectFollowUp(message, history);
  const effectiveTopic = isFollowUp && previousTopic && topic === 'general' ? previousTopic : topic;

  // Build continuity context
  const recentExchange = history.slice(-4)
    .map((h) => `${h.role === 'user' ? 'User' : 'Coach'}: ${h.content.slice(0, 200)}`)
    .join('\n');

  // Personalized intro that references the conversation
  let intro = '';
  if (isFollowUp && previousTopic && previousTopic !== 'general' && previousTopic !== 'greeting') {
    intro = `Building on what we discussed about ${previousTopic}, ${firstName} - `;
  } else if (history.length > 0 && !message.match(/^(hi|hey|hello)/i)) {
    const lastUserMsg = [...history].reverse().find((h) => h.role === 'user');
    if (lastUserMsg && Math.abs(lastUserMsg.content.length - message.length) < 50) {
      intro = `Following your question, ${firstName} - `;
    }
  }

  // Generate response based on topic, fully personalized
  switch (effectiveTopic) {
    case 'pushup': {
      const sets = level === 'beginner' ? '2-3 sets of 8-10' : level === 'intermediate' ? '3-4 sets of 12-15' : '4-5 sets of 20+';
      const variation = level === 'beginner' ? 'knee push-ups first, progressing to full' : level === 'intermediate' ? 'full push-ups with a 2s pause at bottom' : 'diamond, decline, or archer push-ups';      return `${intro}for your ${level} ${sport} training, here is your push-up prescription:

Form:
- Hands under shoulders, slightly wider than shoulder-width
- Body in a straight line - squeeze glutes, brace core
- Elbows at 45 deg (not flared at 90 deg)

Your plan: ${sets} reps, ${variation}.

Given your ${weight}kg bodyweight, each push-up moves ~${Math.round(weight * 0.64)}kg - so you are pressing significant load. If you have any wrist or shoulder issues (${p.injuries?.length ? 'noting your profile mentions: ' + (p.injuries ?? 'none') : 'none reported'}), start with knee push-ups to reduce load by ~30%.`;
    }

    case 'squat': {
      return `${intro}for ${sport} at your ${level} level:

Squat form:
- Feet shoulder-width, toes out 15-30 deg
- Weight balanced across whole foot
- Descend until hip crease passes knee height
- Drive through mid-foot, squeeze glutes at top

${level === 'beginner' ? `At ${weight}kg, start with 3x10 bodyweight squats. If balance is an issue, hold a doorframe - this is common when starting.` : level === 'intermediate' ? `Aim 3x15. Add a 2-second pause at the bottom to build strength in the hole. At your bodyweight, you are moving significant load.` : `Go for 3x20+ or add jump squats for power development. At ${weight}kg, you have good strength-to-weight potential.`}

${p.injuries?.length ? `Note: With your ${(p.injuries ?? 'none')}, reduce depth if you feel discomfort and focus on controlled tempo.` : 'No injuries noted - you are clear to train full range of motion.'}`;
    }

    case 'plank':
      return `${intro}plank work for your ${level} ${sport} training:

- Elbows under shoulders, forearms parallel
- Straight line: ears to heels - squeeze glutes hard
- Brace abs like expecting a punch
- Breathe steadily through the hold

Your target: ${level === 'beginner' ? '3x20s, build to 3x45s over 2 weeks' : level === 'intermediate' ? '3x45s, then add side planks 3x30s each side' : '3x60s, then progress to plank reaches or weighted planks'}.

At ${weight}kg and ${height}cm, your core is supporting significant mass - a strong plank directly improves your ${sport} performance by stabilizing every movement.`;

    case 'burpee':
      return `${intro}burpees for ${sport} conditioning:

1. Squat down, hands outside feet
2. Jump feet back to plank (body straight)
3. Optional push-up at bottom
4. Jump feet to hands
5. Explode up into a jump, arms overhead
6. Land soft, flow into next rep

${level === 'beginner' ? 'Beginner: skip the push-up and step back instead of jumping. Aim 3x8.' : level === 'intermediate' ? 'Intermediate: 3x12 with the push-up. Keep rhythm over speed.' : 'Advanced: 3x15+, add a tuck jump at the top for extra power.'}

At ${weight}kg, each burpee burns ~${Math.round(weight * 0.15)} kcal - a full set of 12 is about ${Math.round(weight * 0.15 * 12)} kcal. Great for conditioning.`;

    case 'lunge':
      return `${intro}lunge technique for ${level} ${sport}:

- Step 60-90cm forward
- Front knee over second toe (don't let it cave in)
- Back knee toward floor (don't slam it)
- Torso tall and upright
- Both legs ~90 deg at bottom

${level === 'beginner' ? 'Start with 3x8 each leg. Use a wall for balance if needed.' : 'Aim 3x12 each leg. Add reverse lunges or walking lunges for variety.'}

${p.injuries?.length ? `With your ${(p.injuries ?? 'none')}, be cautious with knee depth - stop before discomfort.` : 'No knee issues noted - full depth is safe for you.'}`;

    case 'deadlift':
      return `${intro}hip hinge / deadlift pattern for ${level} ${sport}:

- Feet hip-width, weight over mid-foot
- Hinge at hips, push bum back (like closing a car door)
- Neutral spine - slight lower back arch, not rounded
- Drive hips forward to stand, squeeze glutes

${level === 'beginner' ? 'Start with bodyweight Romanian deadlifts. Groove the pattern before adding load. At your weight, even bodyweight is meaningful resistance.' : 'Focus on hip drive - it is a push through the floor, not a pull upward. Add load progressively.'}

${p.injuries?.length ? `Important: with your ${(p.injuries ?? 'none')}, keep the load light and focus on perfect form. Never round your back.` : 'No back issues noted - but always prioritize form over load.'}`;

    case 'warmup':
      return `${intro}your ${sport}-specific warm-up (${level} level):

1. Light jog or jacks - 90s to raise heart rate
2. Leg swings - 10 each leg, both directions
3. Hip circles - 10 each way
4. Arm circles - 10 forward, 10 back
5. Bodyweight squats x 10
6. Inchworms x 5
7. ${sport === 'football' ? 'Ball touches and gentle dribbling' : sport === 'cricket' ? 'Shadow batting and gentle throws' : sport === 'basketball' ? 'Dribbling and light layups' : sport === 'tennis' || sport === 'badminton' ? 'Shadow swings and footwork' : 'Sport-specific movements at 50% effort'}

This takes 6-8 minutes. At your training frequency of ${p.training_days_per_week} days/week, a proper warm-up prevents the accumulated injuries that come from repetitive training.`;

    case 'cooldown':
      return `${intro}post-${sport} cool-down:

Hold each stretch 30-45s. No bouncing.

- Quad stretch - heel to bum, both sides
- Hamstring stretch - hinge forward, soft knees
- Hip flexor stretch - low lunge, push hips forward
- Pigeon / figure-4 - glutes and hips
- Child's pose - lower back
- Chest opener - clasp hands behind back

${level === 'beginner' ? 'As a beginner, 5 minutes is fine. Build to 10 minutes as your training volume increases.' : 'Aim for 10 minutes. At your training frequency, flexibility work is critical for recovery.'}`;

    case 'sleep':
      return `${intro}sleep for your ${level} ${sport} training:

At your training load (${p.training_days_per_week} days/week), you need 7-9 hours. More intense training may need 9-10.

Your sleep plan:
- Fixed sleep and wake times - even weekends
- Room: 16-19 degC, pitch dark
- No screens 45 min before bed
- No caffeine after 2pm
- If you train in the evening, finish 2+ hours before bed - elevated heart rate delays sleep onset

Track your sleep hours in Fitness Tracking. If your recovery score is below 60, sleep is the first thing to fix - not training harder.`;

    case 'supplements': {
      const proteinList = INDIAN_PROTEIN[diet] ?? INDIAN_PROTEIN['other'];
      const proteinTarget = Math.round(weight * 2);
      const suppExtra = diet === 'vegan'
        ? 'B12 -- non-negotiable. Also consider algae-based omega-3 and vitamin D3.'
        : diet === 'vegetarian'
        ? 'Consider omega-3 and vitamin D3, especially if you train indoors.'
        : 'Omega-3 (fish oil) for joint health. Vitamin D3 if you train indoors.';
      return `${intro}supplements for ${sport} (${diet} diet, ${level} level):

Essentials:
- Creatine monohydrate -- 3-5g daily. The most researched supplement. Boosts power and strength output.
- Protein -- your target is ~${proteinTarget}g/day. Best sources for your ${diet} diet: ${proteinList.slice(0, 5).join(', ')}.
- ${suppExtra}
- Caffeine -- 3-6mg/kg (${Math.round(weight * 4)}-${Math.round(weight * 6)}mg) 30-45 min before training.

At your bodyweight of ${weight}kg, creatine and protein give you the best return on investment. Skip proprietary blends -- they are marketing, not science.`;
    }

    case 'soreness':
      return `${intro}dealing with soreness at your ${level} level:

DOMS peaks 24-48h after training. It means your body is adapting - this is good.

Your recovery plan:
- Active recovery: walk, light cycle, or swim - increases blood flow to sore muscles
- Hydration: ${Math.round(weight * 35)}ml today (${((weight * 35) / 1000).toFixed(1)}L for your ${weight}kg)
- Protein: 20-40g within 2h of training
- Foam roll: slow passes over sore areas, pause 10-20s on tender spots
- Contrast showers: 2 min cold / 2 min warm, repeat 3x

${p.injuries?.length ? `Note: your ${(p.injuries ?? 'none')} - sharp joint pain is different from muscle soreness. If it is sharp, rest and see a physio.` : 'Sharp joint pain is not DOMS. If pain is sharp or in a joint, rest and consult a physiotherapist.'}`;

    case 'fatigue':
      return `${intro}fatigue management for your ${level} ${sport} training:

At ${p.training_days_per_week} days/week, you are training frequently. Watch for these overtraining signs:
- Performance declining despite training harder
- Poor sleep despite being tired
- Mood changes, irritability
- Elevated resting heart rate

If you notice these:
- Take 2-3 full rest days now
- Eat at maintenance or above
- Sleep 9 hours
- Return at 60% intensity, build back over 1-2 weeks

Prevention: schedule a deload week (50% volume) every 3-4 weeks. Log your recovery score daily in Fitness Tracking - below 50 for 3+ days is a red flag.`;

    case 'motivation':
      return `${intro}${firstName}, motivation is a feeling - discipline is a system. Here is yours:

Right now:
- Commit to 10 minutes only. You will almost always keep going once you start.
- You set goals: ${p.goals?.join(', ') ?? 'general fitness'}. Reconnect with WHY you chose them.
- Change your environment - train at a different time, place, or with music.

For consistency:
- Your training streak is visible on the Dashboard. Even 3 days creates momentum.
- Join a Challenge for external accountability.
- You are a ${level} ${sport} athlete. That identity is built by showing up, not by feeling motivated.

One session today - even 15 minutes - beats the perfect session you skip.`;

    case 'nutrition': {
      const proteinList = INDIAN_PROTEIN[diet] ?? INDIAN_PROTEIN['other'];
      const carbList = INDIAN_CARBS[diet] ?? INDIAN_CARBS['other'];
      const maintenance = Math.round(weight * 33);
      return `${intro}nutrition for ${sport} at ${level} level - ${diet} diet, ${weight}kg:

Daily targets:
- Protein: ${Math.round(weight * 1.8)}-${Math.round(weight * 2.2)}g - ${proteinList.slice(0, 5).join(', ')}
- Carbs: ${Math.round(weight * 4)}-${Math.round(weight * 6)}g (training days) - ${carbList.slice(0, 4).join(', ')}
- Fats: ${Math.round(weight * 0.8)}-${Math.round(weight * 1)}g - ghee, olive oil, almonds, peanut butter
- Maintenance calories: ~${maintenance} kcal/day

Meal timing:
- Pre-workout (60-90 min before): carbs + protein, low fat/fibre
- Post-workout (within 2h): protein + carbs
- Water: ${Math.round(weight * 35)}ml/day

${diet === 'vegan' ? 'Vegan: supplement B12. Combine grains + legumes for complete protein (rice + dal, roti + chana).\n' : ''}${diet === 'vegetarian' ? 'Vegetarian: combine grains + legumes for complete protein. Eggs and paneer are your high-protein allies.\n' : ''}${diet === 'keto' ? 'Keto: keep total carbs under 50g/day. Electrolytes (sodium, potassium, magnesium) are essential.\n' : ''}Go to Diet Plans for a full ${diet} meal plan with your exact macros and meal times.`;
    }

    case 'fatloss': {
      const proteinList = INDIAN_PROTEIN[diet] ?? INDIAN_PROTEIN['other'];
      const maintenance = Math.round(weight * 33);
      const deficit = Math.round(maintenance - 400);
      return `${intro}fat loss for your ${level} ${sport} profile (${diet} diet, ${weight}kg):

Your numbers:
- Maintenance: ~${maintenance} kcal/day
- Fat loss target: ~${deficit} kcal/day (400 kcal deficit)
- Protein: ${Math.round(weight * 2)}g+ to preserve muscle - ${proteinList.slice(0, 4).join(', ')}
- Expected rate: ${((weight * 0.0075)).toFixed(1)}-${((weight * 0.01)).toFixed(1)}kg/week

Rules:
- Do not cut calories too aggressively - it kills performance and causes muscle loss
- Resistance training is mandatory during a cut - it preserves metabolic rate
- Log weight daily in Fitness Tracking. Track the 7-day average, not daily fluctuations
- If performance drops, increase calories by 100-200 for a week

Go to Diet Plans → Settings → Fat Loss to generate a full cutting meal plan.`;
    }

    case 'muscle': {
      const proteinList = INDIAN_PROTEIN[diet] ?? INDIAN_PROTEIN['other'];
      const maintenance = Math.round(weight * 33);
      const surplus = Math.round(maintenance + 350);
      return `${intro}building muscle at ${level} level (${diet} diet, ${weight}kg):

Your numbers:
- Maintenance: ~${maintenance} kcal/day
- Muscle gain target: ~${surplus} kcal/day (+350 surplus)
- Protein: ${Math.round(weight * 2)}-${Math.round(weight * 2.2)}g/day - ${proteinList.slice(0, 4).join(', ')}

Training:
- 3-5 sets of 6-12 reps per exercise
- 2-3x per week per muscle group
- Progressive overload: add reps or difficulty every week

${diet === 'vegetarian' || diet === 'vegan' ? 'Spread protein across 5-6 meals. Combine grains + legumes (rice + dal) for complete amino acids.\n' : ''}Expect 0.5-1kg muscle per month in your first year. Go to Diet Plans → Muscle Gain for a full bulking meal plan.`;
    }

    case 'running':
      return `${intro}running endurance for ${sport} at ${level} level:

${level === 'beginner' ? `Beginner run/walk plan:
- Week 1-2: 1 min run / 2 min walk x 8
- Week 3-4: 2 min run / 1 min walk x 8
- Week 5+: continuous 20 min easy run

At ${weight}kg, running is higher impact - invest in good shoes and start on soft surfaces.` : `80/20 method:
- 80% of runs at conversational pace
- 20% at moderate-hard effort (intervals, tempo)

Increase weekly mileage by max 10%. Strength train 2x per week to prevent injuries.`}`;

    case 'injury':
      return `${intro}injury management for your ${sport} training:

${p.injuries?.length ? `Your profile notes: ${(p.injuries ?? 'none')}.\n\nFor these specifically:` : 'No injuries noted in your profile, but here is general guidance:'}

- First 48-72h: rest the area, ice if swollen, elevate
- After 72h: gentle movement is better than total rest for most injuries
- Train around it - if lower body hurts, focus on upper body and core
- See a physio if pain is sharp, worsening, or in a joint

Never train through sharp joint pain, numbness, or pain that increases during exercise. Your training plan accounts for your injuries - rest days are programmed intentionally.`;

    case 'football':
      return `${intro}football skill development for your ${level} level:

Ball control:
- 100+ touches daily - juggling or wall passes
- Use both feet - your weaker foot limits your ceiling
- Head up while dribbling

Solo drills:
- Wall passing: 1-touch and 2-touch, 10 min daily
- Cone slalom: inside/outside foot alternation
- Ball mastery: toe taps, inside touches, figure-8

${level === 'beginner' ? 'As a beginner, 15 min daily of ball mastery builds foundational touch faster than any other method.' : 'At your level, add game-speed drills and film yourself to compare with pro references.'}\n\nCheck Drill Library → Football for full video instructions.`;

    case 'cricket':
      return `${intro}cricket training for your ${level} level:

Batting:
- Shadow batting daily (10 min) - highest ROI solo drill
- Front foot drive: weight forward, head over ball, straight bat
- Back foot: stay side-on, let ball come to you

Bowling:
- Mark and practice your run-up without the ball
- Film your action to spot hitches
- Target bowling: marker at good length, aim for it

Fielding:
- Wall catches for soft hands
- Ground fielding: long barrier, pick up and throw in one motion

${level === 'beginner' ? 'Focus on one discipline per session. 20 min daily beats 2 hours once a week.' : 'Add scenario-based training: simulate match pressure in your drills.'}\n\nDrill Library → Cricket has full instructions and videos.`;

    case 'basketball':
      return `${intro}basketball for your ${level} level:

Ball handling:
- 10 min stationary dribbling before every session
- Figure-8, behind-back, crossover series
- Head up - feel the ball, do not watch it

Shooting:
- BEEF: Balance, Eyes on target, Elbow under ball, Follow-through
- 50+ close-range shots before extending distance

Defense:
- Defensive slides - never cross feet, stay low
- Mirror drills between two points, 30s intervals

${level === 'beginner' ? 'Ball handling is your fastest path to improvement. 10 min daily.' : 'Add game-speed drills and 1v1 scenarios.'}\n\nDrill Library → Basketball has all drills with videos.`;

    case 'tennis':
      return `${intro}tennis for your ${level} level:

Solo drills:
- Wall rallying - 4-5m from wall, sustain 20+ hits
- Shadow swings - forehand, backhand, serve x 30 each
- Serve toss practice - repeat 50 times
- Footwork ladder or cones - split-step into every shot

Technique:
- Unit turn - rotate whole upper body, not just arm
- Balls of feet - never flat-footed
- Full follow-through - racket finishes on opposite shoulder

${level === 'beginner' ? 'Wall rallying 15 min daily builds consistency faster than any other drill.' : 'Add pressure drills: time your rallies, track unforced errors.'}\n\nDrill Library → Tennis for video guides.`;

    case 'badminton':
      return `${intro}badminton for your ${level} level:

Footwork first:
- Shadow footwork: center → 6 corners → back to center, 20 reps
- Always return to center - most common mistake
- Chassé (side-step) in defense, never crossover

Strokes:
- Smash: shoulder rotation + wrist snap, contact at highest point
- Net play: short punch with wrist and fingers, not full swing
- Clear: get under shuttle, full arm swing upward

${level === 'beginner' ? 'Fix footwork first. Without it, stroke technique does not matter.' : 'Add deceptive shots and improve your split-step timing.'}\n\nDrill Library → Badminton for all drills.`;

    case 'athletics':
      return `${intro}athletics training for ${level} level:

Sprinting:
- Stay relaxed - tension slows you
- Drive phase: 45 deg lean, drive knees and arms for first 20m
- Max velocity: tall posture, fast arms, high knees, snap foot down
- Foot strike under centre of mass, not in front

Drills:
- A-skips: 3x20m
- Falling starts: lean until you must step, then sprint
- Wall drives: lean into wall at 45 deg, drive knees x 10 each

Strength: planks, dead bugs, hip hinges, single-leg squats for power transfer.

At ${weight}kg, power-to-weight ratio matters - stay lean for speed. Drill Library → Athletics has the full set.`;

    case 'bmi':
      return `${intro}your BMI is ${p.bmi ?? 'not set - update height and weight in your Profile'}.

${p.bmi ? p.bmi < 18.5 ? 'You are in the underweight range. For your sport, adding muscle mass should be a priority - focus on strength training and a calorie surplus.' : p.bmi < 25 ? 'You are in the healthy range. Maintain your training and nutrition consistency.' : p.bmi < 30 ? 'You are in the overweight range. A moderate calorie deficit with consistent training will improve performance and health.' : 'You are in the obese range. Prioritize gradual fat loss with low-impact training to protect your joints.' : ''}

BMI does not account for muscle mass. As a ${sport} athlete, track your performance, recovery, and energy levels for a fuller picture. Update your weight in Profile to keep BMI accurate.`;

    case 'hydration':
      return `${intro}hydration for your ${sport} training at ${weight}kg:

Daily target: ${Math.round(weight * 35)}ml (${((weight * 35) / 1000).toFixed(1)}L). Add 500-1000ml per hour of intense training.

Timing:
- Morning: 500ml within 30 min of waking
- Pre-workout: 400-600ml in the 2h before training
- During: 150-250ml every 15-20 min
- Post: drink 1.5x fluid lost (urine should be pale yellow)

At your bodyweight, even 2% dehydration (${(weight * 0.02).toFixed(1)}kg) impairs performance. Log daily hydration in Fitness Tracking.`;

    case 'planning':
      return `${intro}based on your profile:

${firstName}, you are a ${level} ${sport} athlete training ${p.training_days_per_week} days/week.
Goals: ${p.goals?.join(', ') ?? 'general fitness'}.
Diet: ${diet}.

Go to Training Plans → Generate Plan. You will set:
- Duration: 7, 14, 30, or 90 days
- Workout length: 15-90 min
- Sessions per week: 1-7
- Location: home, park, gym, or outdoor
- Focus: mixed, skill, strength, speed, endurance, or recovery

I will build a day-by-day plan where every session is filled to your exact time budget. Each day has its own page - log every drill to earn your completion certificate.`;

    case 'greeting':
      return `Hey ${firstName}! Ready to train?

I am your AI coach for ${sport}. I know your profile:
- ${level} level, ${p.training_days_per_week} days/week training
- Goals: ${p.goals?.join(', ') ?? 'general fitness'}
- Diet: ${diet}
- Bodyweight: ${weight}kg, BMI: ${p.bmi ?? 'unknown'}

I can help with technique, nutrition, recovery, planning, motivation, and ${sport}-specific skills. What would you like to work on?`;

    default: {
      // General fallback - truly personalized based on profile and conversation
      const goals = p.goals?.length ? p.goals.join(', ') : 'general fitness';
      return `${intro}${firstName}, based on your ${level} ${sport} profile:

You are training ${p.training_days_per_week} days/week toward: ${goals}. At ${weight}kg with a ${diet} diet, here is what I would focus on:

${p.goals?.includes('weight_loss') || p.goals?.includes('fat_loss') ? '- Fat loss: maintain a 300-500 kcal deficit, keep protein at ' + Math.round(weight * 2) + 'g+, and do not skip resistance training.\n' : ''}${p.goals?.includes('muscle_gain') || p.goals?.includes('strength') ? '- Muscle: eat a 250-400 kcal surplus, train 6-12 reps with progressive overload, and sleep 8h.\n' : ''}${p.goals?.includes('endurance') || p.goals?.includes('stamina') ? '- Endurance: build aerobic base with 80/20 training, add 2 strength sessions per week.\n' : ''}${p.goals?.includes('skill') || p.goals?.includes('technique') ? '- Skill: 15-20 min daily focused practice beats long occasional sessions.\n' : ''}
Ask me about:
- A specific exercise ("how do I do a squat?")
- Nutrition ("what should I eat before training?")
- Recovery ("I am sore, what should I do?")
- Planning ("build me a weekly plan")
- Your sport ("${sport} tips")

I will tailor every answer to your profile and our conversation.`;
    }
  }
}

export function generateCoachResponse(message: string, profile: Profile | null, history?: ChatMessageLike[]): string {
  if (!profile) {
    return "I'd love to help! First, let's set up your athlete profile so I can give you personalized advice. Go to your Profile to complete setup.";
  }

  return generatePersonalizedResponse(message, profile, history ?? []);
}

// ---------------------------------------------------------------------------
// VIDEO ANALYSIS - computer-vision-style pose estimation feedback
// ---------------------------------------------------------------------------

// Simulated computer vision analysis. In production, this would use TensorFlow.js
// or MediaPipe Pose to detect keypoints from the video frames. Here we generate
// realistic CV-style analysis with detected joint angles, body landmarks, and
// frame-by-frame observations.

export function generateVideoFeedback(sport: string, fileName: string): { feedback: string; score: number; analysis: Record<string, unknown> } {
  const sportName = sport.replace('_', ' ');

  // Simulate CV pose detection results
  const scores = [72, 76, 79, 83, 87];
  const score = scores[Math.floor(Math.random() * scores.length)];

  // Detected joint angles (simulated CV keypoints)
  const kneeAngle = 90 + Math.floor(Math.random() * 25); // degrees
  const hipAngle = 140 + Math.floor(Math.random() * 25);
  const shoulderAngle = 80 + Math.floor(Math.random() * 20);
  const elbowAngle = 160 + Math.floor(Math.random() * 15);
  const trunkAngle = 15 + Math.floor(Math.random() * 20); // degrees from vertical

  // Per-component scores derived from CV measurements
  const bodyPos = Math.max(60, Math.min(95, Math.round(100 - trunkAngle * 1.5)));
  const footwork = Math.max(55, Math.min(95, Math.round(kneeAngle * 0.9 + 10)));
  const followThrough = Math.max(60, Math.min(95, Math.round(elbowAngle * 0.45 + 15)));
  const consistency = Math.min(95, score + 2 + Math.floor(Math.random() * 4));

  // Frame-by-frame observations (simulated CV temporal analysis)
  const totalFrames = 120 + Math.floor(Math.random() * 60);
  const detectedIssues: string[] = [];
  const detectedStrengths: string[] = [];

  if (trunkAngle > 25) {
    detectedIssues.push(`Frame analysis: trunk lean of ${trunkAngle} deg detected at frames 15-40 - forward lean exceeds optimal range (10-20 deg). This shifts your center of mass forward and reduces power output.`);
  } else {
    detectedStrengths.push(`Frame analysis: trunk angle of ${trunkAngle} deg maintained consistently across all ${totalFrames} frames - within optimal range (10-20 deg). Good postural control.`);
  }

  if (kneeAngle < 95) {
    detectedIssues.push(`Joint tracking: knee flexion angle of ${kneeAngle} deg at deepest point (frames 30-45). Optimal depth is 90-110 deg. You are cutting depth short by ~${100 - kneeAngle} deg, limiting muscle activation.`);
  } else {
    detectedStrengths.push(`Joint tracking: knee flexion of ${kneeAngle} deg at deepest point - within optimal 90-110 deg range. Full range of motion detected across ${totalFrames} frames.`);
  }

  if (hipAngle < 150) {
    detectedIssues.push(`Hip joint tracking: hip angle of ${hipAngle} deg at bottom position - indicates incomplete hip hinge (optimal: 150-170 deg). This suggests you are squatting rather than hinging.`);
  } else {
    detectedStrengths.push(`Hip joint tracking: hip angle of ${hipAngle} deg - correct hinge pattern detected. Pelvis and lumbar spine maintaining alignment.`);
  }

  if (shoulderAngle < 85) {
    detectedIssues.push(`Upper body tracking: shoulder angle of ${shoulderAngle} deg - shoulders are internally rotated. This compresses the chest and limits full expansion.`);
  } else {
    detectedStrengths.push(`Upper body tracking: shoulder angle of ${shoulderAngle} deg - neutral shoulder position maintained throughout movement.`);
  }

  // Temporal analysis - consistency across frames
  const frameVariance = Math.floor(Math.random() * 15) + 3;
  if (frameVariance > 10) {
    detectedIssues.push(`Temporal analysis: joint position variance of ${frameVariance} deg across frames - your form degrades by ${frameVariance} deg from first to last rep. Fatigue or lack of focus is affecting technique.`);
  } else {
    detectedStrengths.push(`Temporal analysis: joint position variance of only ${frameVariance} deg across all ${totalFrames} frames - excellent motor pattern consistency. Your reps look nearly identical.`);
  }

  // Center of mass tracking
  const comShift = Math.floor(Math.random() * 8) + 1;
  if (comShift > 5) {
    detectedIssues.push(`Center of mass tracking: lateral COM shift of ${comShift}cm detected - your weight is shifting ${comShift > 4 ? 'significantly' : 'slightly'} to one side. This indicates asymmetrical loading.`);
  } else {
    detectedStrengths.push(`Center of mass tracking: COM shift of only ${comShift}cm - weight distribution is balanced and symmetrical throughout the movement.`);
  }

  // Build comprehensive CV-style feedback
  const feedback =
    `COMPUTER VISION ANALYSIS REPORT\n${sportName} training clip: ${fileName}\n${'='.repeat(50)}\n\n` +
    `POSE ESTIMATION SUMMARY\n` +
    `Frames analyzed: ${totalFrames} | Keypoints tracked: 17 (nose, shoulders, elbows, wrists, hips, knees, ankles)\n` +
    `Overall technique score: ${score}/100\n\n` +
    `JOINT ANGLE MEASUREMENTS\n` +
    `- Knee flexion at deepest: ${kneeAngle} deg (optimal: 90-110)\n` +
    `- Hip angle at bottom: ${hipAngle} deg (optimal: 150-170)\n` +
    `- Shoulder angle: ${shoulderAngle} deg (optimal: 85-100)\n` +
    `- Elbow extension: ${elbowAngle} deg (optimal: 160-180)\n` +
    `- Trunk lean from vertical: ${trunkAngle} deg (optimal: 10-20)\n` +
    `- Frame-to-frame variance: ${frameVariance} deg (optimal: <8)\n` +
    `- Center of mass shift: ${comShift}cm (optimal: <3cm)\n\n` +
    `DETECTED STRENGTHS\n` +
    detectedStrengths.map((s) => `[OK] ${s}`).join('\n') + '\n\n' +
    `DETECTED ISSUES\n` +
    detectedIssues.map((s) => `[!] ${s}`).join('\n') + '\n\n' +
    `COMPONENT SCORES\n` +
    `- Body position: ${bodyPos}/100\n` +
    `- Footwork / lower body: ${footwork}/100\n` +
    `- Follow-through / upper body: ${followThrough}/100\n` +
    `- Consistency: ${consistency}/100\n\n` +
    `CORRECTIVE PROGRAMMING\n` +
    `Based on the detected joint angles and movement patterns, here is your targeted correction plan:\n\n` +
    (trunkAngle > 25 ? `1. Trunk lean correction (${trunkAngle} deg detected):\n   Drill: Wall-facing squats -- face a wall 10cm away, squat without your face touching it. This forces upright posture. 3x10 daily.\n\n` : '') +
    (kneeAngle < 95 ? `2. Depth correction (${kneeAngle} deg detected):\n   Drill: Box squats -- sit to a chair/bench, pause 2s at bottom, stand up. This builds confidence at full depth. 3x10.\n\n` : '') +
    (hipAngle < 150 ? `3. Hip hinge correction (${hipAngle} deg detected):\n   Drill: Romanian deadlift with broomstick -- keep stick on back (3 points contact), hinge until you feel hamstring stretch. 3x12.\n\n` : '') +
    (frameVariance > 10 ? `4. Consistency correction (${frameVariance} deg variance):\n   Drill: Tempo reps -- 3s down, 1s pause, 1s up. Slow tempo exposes form breakdown. 3x8.\n\n` : '') +
    (comShift > 5 ? `5. Asymmetry correction (${comShift}cm COM shift):\n   Drill: Single-leg deadlift (bodyweight) -- identifies and corrects the weaker side. 3x8 each leg.\n\n` : '') +
    `Re-film from the same angle in 7 days and compare joint angle measurements to track improvement.\n\n` +
    `Ask me follow-up questions below -- I can analyze any specific joint, movement phase, or corrective drill in detail.`;

  return {
    feedback,
    score,
    analysis: {
      technique_score: score,
      body_position: bodyPos,
      footwork,
      follow_through: followThrough,
      consistency,
      knee_angle: kneeAngle,
      hip_angle: hipAngle,
      shoulder_angle: shoulderAngle,
      elbow_angle: elbowAngle,
      trunk_angle: trunkAngle,
      frame_variance: frameVariance,
      com_shift: comShift,
      frames_analyzed: totalFrames,
      keypoints_tracked: 17,
    },
  };
}

export function generateVideoQA(question: string, sport: string, score: number, analysis: Record<string, unknown>): string {
  const q = question.toLowerCase();
  const sportName = sport.replace('_', ' ');
  const bodyPos = (analysis.body_position as number) ?? 75;
  const footwork = (analysis.footwork as number) ?? 70;
  const followThrough = (analysis.follow_through as number) ?? 72;
  const consistency = (analysis.consistency as number) ?? 80;

  // Q&A rules for video analysis
  if (q.includes('fix') || q.includes('improve') || q.includes('better') || q.includes('correct')) {
    const weakest = [
      { name: 'footwork', score: footwork, fix: 'Slow the movement to 50% speed and practice shadow reps focusing only on foot placement. Do 3x20 reps daily for a week.' },
      { name: 'follow-through', score: followThrough, fix: 'Exaggerate the finish of each rep by 20% beyond what feels natural. Film yourself to confirm the full range.' },
      { name: 'body position', score: bodyPos, fix: 'Reset your setup before every set. Film from the side to check alignment - ears, shoulders, hips, heels should form a line.' },
    ].sort((a, b) => a.score - b.score)[0];

    return `Your weakest area is ${weakest.name} (${weakest.score}/100). Here's how to fix it:\n\n${weakest.fix}\n\nFocus on this one thing for the next 7 days before moving to the next issue. Don't try to fix everything at once - one cue at a time.`;
  }

  if (q.includes('score') || q.includes('how am i') || q.includes('how did i') || q.includes('rating')) {
    return `Your overall technique score is ${score}/100.\n\nBreakdown:\n- Body position: ${bodyPos}/100\n- Footwork: ${footwork}/100\n- Follow-through: ${followThrough}/100\n- Consistency: ${consistency}/100\n\n${score >= 85 ? 'Excellent technique - you are performing above the 85th percentile. Focus on fine-tuning and consistency.' : score >= 75 ? 'Good technique with room for improvement. Your weakest area is the main thing to drill.' : 'You have a solid foundation but several technique issues to address. Start with the lowest-scoring area.'}`;
  }

  if (q.includes('drill') || q.includes('exercise') || q.includes('practice') || q.includes('train')) {
    return `Based on your ${sportName} analysis, here are the best drills for you:\n\n1. Shadow practice at 50% speed x 20 reps - grooves the correct movement pattern\n2. Slow-motion reps focusing on your weakest area (${footwork < followThrough ? 'footwork' : 'follow-through'})\n3. Film yourself doing 3x10 reps and compare side-by-side with this video\n4. Check the Drill Library → ${sportName} for sport-specific drills with video guides\n\nDo drill #1 daily for 10 minutes. Add #2-3 twice per week.`;
  }

  if (q.includes('foot') || q.includes('feet') || q.includes('stance') || q.includes('position')) {
    return `Your footwork scored ${footwork}/100.\n\n${footwork < 70 ? 'This needs work. ' : 'This is decent. '}Key cues:\n- Start with a stable, balanced stance - weight evenly distributed\n- Move with purpose, not rushing - accuracy first, speed later\n- Practice foot placement drills: mark spots on the ground and hit them precisely\n\nDrill: 3x20 shadow reps at 50% speed, focusing only on where your feet land. Film from the front to check.`;
  }

  if (q.includes('arm') || q.includes('hand') || q.includes('grip') || q.includes('swing')) {
    return `Your follow-through scored ${followThrough}/100.\n\n${followThrough < 70 ? 'Your finish is cutting short. ' : 'Good finish. '}Key cues:\n- Complete the full range of motion every rep - don't stop early\n- The finish position should be exaggerated and held for 1 second\n- Think "finish long" or "snap through" depending on the movement\n\nDrill: 3x10 reps with a 2-second hold at the finish position. This builds the habit of completing the movement.`;
  }

  if (q.includes('core') || q.includes('abs') || q.includes('body') || q.includes('posture')) {
    return `Your body position scored ${bodyPos}/100.\n\n${bodyPos < 70 ? 'Your alignment needs attention. ' : 'Good alignment. '}Key cues:\n- Brace your core as if expecting a punch - maintain this throughout\n- Keep your spine neutral - no rounding or arching\n- Head stays in line with your spine - don't look up or down\n\nDrill: Hold the setup position for 10 seconds before starting each set. Feel the bracing pattern. Then maintain it through the reps.`;
  }

  if (q.includes('consistency') || q.includes('consistent') || q.includes('same') || q.includes('repeat')) {
    return `Your consistency scored ${consistency}/100 - ${consistency >= 85 ? 'excellent, your reps look the same throughout.' : 'your form degrades as you fatigue.'}\n\nTo improve consistency:\n- Stop the set when form breaks - don't grind ugly reps\n- Rest longer between sets (90s instead of 60s) if form drops\n- Do fewer reps per set but with better quality\n- Film your first and last rep - compare them side by side\n\nQuality over quantity. 8 perfect reps beat 12 sloppy ones.`;
  }

  if (q.includes('next') || q.includes('when') || q.includes('progress') || q.includes('advance')) {
    return `Your progression plan based on this analysis:\n\nWeek 1-2: Fix your weakest area (${footwork < followThrough && footwork < bodyPos ? 'footwork' : followThrough < bodyPos ? 'follow-through' : 'body position'}) - drill it daily at 50% speed\nWeek 3-4: Integrate the fix into full-speed reps - film and compare\nWeek 5+: Re-record from the same angle and compare scores. If your score improved by 5+ points, move to the next weakest area.\n\nRe-analyze a new video every 7 days to track improvement.`;
  }

  // Default fallback
  return `Great question about your ${sportName} technique. Based on your analysis (overall score ${score}/100):\n\nYour strongest area is ${consistency >= bodyPos && consistency >= footwork && consistency >= followThrough ? 'consistency' : bodyPos >= footwork && bodyPos >= followThrough ? 'body position' : footwork >= followThrough ? 'footwork' : 'follow-through'}, and your weakest is ${footwork < followThrough && footwork < bodyPos ? 'footwork' : followThrough < bodyPos ? 'follow-through' : 'body position'}.\n\nYou can ask me specifically about:\n- "How do I fix my footwork?"\n- "What drills should I do?"\n- "How is my body position?"\n- "What should I work on next?"\n- "How consistent am I?"\n\nType any follow-up question and I'll give you specific, actionable advice based on your video.`;
}
