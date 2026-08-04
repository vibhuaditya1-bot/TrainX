export type Sport =
  | 'football'
  | 'cricket'
  | 'basketball'
  | 'tennis'
  | 'badminton'
  | 'athletics'
  | 'general_fitness';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export type PlanType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type PlanDuration = '7' | '14' | '30' | '90';
export type WorkoutLength = '15' | '30' | '45' | '60' | '90';

export type DietPreference = 'non-vegetarian' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'other';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  sport: Sport;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  fitness_level: FitnessLevel;
  goals: string[];
  experience_years: number;
  available_equipment: string[];
  training_days_per_week: number;
  preferred_time: 'morning' | 'afternoon' | 'evening' | 'flexible';
  injuries: string | null;
  diet_preference: DietPreference;
  created_at: string;
  updated_at: string;
}

export interface FitnessGoal {
  id: string;
  user_id: string;
  goal_name: string;
  metric: string;
  target_value: number;
  target_unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  active: boolean;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  plan_type: PlanType;
  start_date: string;
  end_date: string | null;
  title: string;
  description: string | null;
  content: PlanContent;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PlanContent {
  days?: PlannedDay[];
  summary?: string;
  focus?: string;
  drills?: string[];
  notes?: string;
  planDuration?: PlanDuration;
  workoutLength?: WorkoutLength;
  hasPartner?: boolean;
  trainingLocation?: 'home' | 'park' | 'gym' | 'outdoor';
  totalDays?: number;
  sessionsPerWeek?: number;
}

export interface PlannedDay {
  day: string;
  dayNumber?: number;
  date?: string;
  title: string;
  focus: string;
  drills: PlannedDrill[];
  duration_minutes: number;
  warmup_minutes?: number;
  cooldown_minutes?: number;
  completed?: boolean;
  is_rest_day?: boolean;
  intensity?: 'low' | 'moderate' | 'high' | 'very_high';
  drills_logged?: boolean[];
}

export interface PlannedDrill {
  name: string;
  duration: string;
  duration_minutes: number;
  intensity: string;
  sets?: string;
  reps?: string;
  rest?: string;
  description?: string;
  youtube_id?: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id: string | null;
  workout_date: string;
  sport: Sport;
  title: string;
  duration_minutes: number;
  intensity: number;
  calories_burned: number;
  completed: boolean;
  notes: string | null;
  drills_completed: { name: string; duration: string }[];
  created_at: string;
}

export interface DailyMetric {
  id: string;
  user_id: string;
  metric_date: string;
  weight_kg: number | null;
  steps: number | null;
  calories_consumed: number | null;
  calories_burned: number | null;
  sleep_hours: number | null;
  hydration_ml: number | null;
  recovery_score: number | null;
  resting_hr: number | null;
  notes: string | null;
  created_at: string;
}

export interface Drill {
  id: string;
  sport: Sport;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  equipment: string[];
  description: string;
  instructions: string[];
  tips: string[];
  youtube_id: string | null;
  muscle_groups: string[];
  calories_per_min: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  sport: Sport | null;
  category: string;
  target_value: number;
  target_unit: string;
  duration_days: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  completed: boolean;
  joined_at: string;
  completed_at: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string | null;
  threshold: number;
  metric: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface FitnessGoal {
  id: string;
  user_id: string;
  goal_type: string;
  target_steps: number;
  target_calories_burned: number;
  target_sleep_hours: number;
  target_hydration_ml: number;
  target_workouts_per_week: number;
  target_weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface VideoAnalysis {
  id: string;
  user_id: string;
  sport: Sport;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis: Record<string, unknown> | null;
  feedback: string | null;
  score: number | null;
  created_at: string;
}

export const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: 'football', label: 'Football', icon: 'Circle' },
  { value: 'cricket', label: 'Cricket', icon: 'Target' },
  { value: 'basketball', label: 'Basketball', icon: 'Dribbble' },
  { value: 'tennis', label: 'Tennis', icon: 'CircleDot' },
  { value: 'badminton', label: 'Badminton', icon: 'Feather' },
  { value: 'athletics', label: 'Athletics', icon: 'Zap' },
  { value: 'general_fitness', label: 'General Fitness', icon: 'Dumbbell' },
];

export const FITNESS_LEVELS: { value: FitnessLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'New to training or returning after a long break' },
  { value: 'intermediate', label: 'Intermediate', description: 'Training consistently for 6+ months' },
  { value: 'advanced', label: 'Advanced', description: 'Training seriously for 2+ years' },
  { value: 'elite', label: 'Elite', description: 'Competitive athlete level' },
];

export const EQUIPMENT_OPTIONS = [
  'None (bodyweight only)',
  'Dumbbells',
  'Resistance Bands',
  'Kettlebell',
  'Pull-up Bar',
  'Jump Rope',
  'Yoga Mat',
  'Medicine Ball',
  'Football',
  'Cricket Bat',
  'Tennis Racket',
  'Badminton Racket',
  'Basketball',
  'Cones',
  'Agility Ladder',
];

export const GOAL_OPTIONS = [
  'Build Muscle',
  'Lose Weight',
  'Improve Endurance',
  'Increase Strength',
  'Enhance Speed',
  'Boost Agility',
  'Improve Flexibility',
  'Sport-Specific Skills',
  'General Health',
  'Recovery & Mobility',
];
