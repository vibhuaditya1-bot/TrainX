/*
# TrainX Core Schema

1. Purpose
   TrainX is an AI-powered sports & fitness app. This migration creates the core
   tables for athlete profiles, training plans, workout logs, drills, AI chat,
   challenges, achievements, and video analyses.

2. New Tables
   - `profiles`            : athlete profile (age, height, weight, BMI, level, goals, equipment, schedule)
   - `training_plans`      : AI-generated daily/weekly/monthly plans
   - `workout_logs`        : completed workout sessions (progress tracking)
   - `daily_metrics`       : daily fitness metrics (steps, calories, sleep, hydration, recovery, weight)
   - `drills`              : sport-specific drill library (seeded, shared across users)
   - `chat_messages`       : AI coach conversation history
   - `challenges`          : fitness challenges (shared, seeded)
   - `challenge_participants` : user participation + progress in challenges
   - `achievements`         : achievement definitions (shared, seeded)
   - `user_achievements`    : achievements earned by users
   - `video_analyses`       : AI analysis results for uploaded training videos

3. Security
   - RLS enabled on every table.
   - Owner-scoped CRUD on user data tables (profiles, training_plans, workout_logs,
     daily_metrics, chat_messages, challenge_participants, user_achievements,
     video_analyses) scoped to `auth.uid()`.
   - Shared/seeded tables (drills, challenges, achievements) are read-only for
     authenticated users (SELECT only).

4. Notes
   - `user_id` columns default to `auth.uid()` so client inserts omitting the
     owner still satisfy WITH CHECK policies.
   - BMI is stored as a computed snapshot (recomputed on profile update / metric insert).
*/

-- PROFILES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text,
  avatar_url text,
  sport text NOT NULL DEFAULT 'general_fitness',
  age int,
  height_cm numeric,
  weight_kg numeric,
  bmi numeric GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 AND weight_kg > 0
         THEN round((weight_kg / (height_cm / 100.0) ^ 2)::numeric, 1)
         ELSE NULL END
  ) STORED,
  fitness_level text NOT NULL DEFAULT 'beginner'
    CHECK (fitness_level IN ('beginner','intermediate','advanced','elite')),
  goals text[] NOT NULL DEFAULT '{}',
  experience_years numeric NOT NULL DEFAULT 0,
  available_equipment text[] NOT NULL DEFAULT '{}',
  training_days_per_week int NOT NULL DEFAULT 3,
  preferred_time text DEFAULT 'morning'
    CHECK (preferred_time IN ('morning','afternoon','evening','flexible')),
  injuries text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- TRAINING PLANS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('daily','weekly','monthly')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  title text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_plans_user ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_type ON training_plans(plan_type);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plans" ON training_plans;
CREATE POLICY "select_own_plans" ON training_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plans" ON training_plans;
CREATE POLICY "insert_own_plans" ON training_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plans" ON training_plans;
CREATE POLICY "update_own_plans" ON training_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plans" ON training_plans;
CREATE POLICY "delete_own_plans" ON training_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- WORKOUT LOGS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES training_plans(id) ON DELETE SET NULL,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  sport text NOT NULL DEFAULT 'general_fitness',
  title text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 0,
  intensity int NOT NULL DEFAULT 5 CHECK (intensity BETWEEN 1 AND 10),
  calories_burned int NOT NULL DEFAULT 0,
  completed bool NOT NULL DEFAULT true,
  notes text,
  drills_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(workout_date);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workouts" ON workout_logs;
CREATE POLICY "select_own_workouts" ON workout_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workouts" ON workout_logs;
CREATE POLICY "insert_own_workouts" ON workout_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workouts" ON workout_logs;
CREATE POLICY "update_own_workouts" ON workout_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workouts" ON workout_logs;
CREATE POLICY "delete_own_workouts" ON workout_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- DAILY METRICS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  steps int,
  calories_consumed int,
  calories_burned int,
  sleep_hours numeric,
  hydration_ml int,
  recovery_score int CHECK (recovery_score BETWEEN 0 AND 100),
  resting_hr int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user ON daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_metrics" ON daily_metrics;
CREATE POLICY "select_own_metrics" ON daily_metrics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_metrics" ON daily_metrics;
CREATE POLICY "insert_own_metrics" ON daily_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_metrics" ON daily_metrics;
CREATE POLICY "update_own_metrics" ON daily_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_metrics" ON daily_metrics;
CREATE POLICY "delete_own_metrics" ON daily_metrics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- DRILLS (shared library) -----------------------------------------------
CREATE TABLE IF NOT EXISTS drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration_minutes int NOT NULL DEFAULT 10,
  equipment text[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  instructions text[] NOT NULL DEFAULT '{}',
  tips text[] NOT NULL DEFAULT '{}',
  youtube_id text,
  muscle_groups text[] NOT NULL DEFAULT '{}',
  calories_per_min int NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drills_sport ON drills(sport);

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_drills" ON drills;
CREATE POLICY "read_drills" ON drills FOR SELECT
  TO authenticated USING (true);

-- CHAT MESSAGES ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat" ON chat_messages;
CREATE POLICY "select_own_chat" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat" ON chat_messages;
CREATE POLICY "insert_own_chat" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat" ON chat_messages;
CREATE POLICY "delete_own_chat" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CHALLENGES (shared) ----------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  sport text,
  category text NOT NULL,
  target_value int NOT NULL,
  target_unit text NOT NULL,
  duration_days int NOT NULL DEFAULT 7,
  difficulty text NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner','intermediate','advanced')),
  icon text,
  points int NOT NULL DEFAULT 100,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_challenges" ON challenges;
CREATE POLICY "read_challenges" ON challenges FOR SELECT
  TO authenticated USING (true);

-- CHALLENGE PARTICIPANTS -------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  progress int NOT NULL DEFAULT 0,
  completed bool NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_part_user ON challenge_participants(user_id);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_participations" ON challenge_participants;
CREATE POLICY "select_own_participations" ON challenge_participants FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_participations" ON challenge_participants;
CREATE POLICY "insert_own_participations" ON challenge_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_participations" ON challenge_participants;
CREATE POLICY "update_own_participations" ON challenge_participants FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_participations" ON challenge_participants;
CREATE POLICY "delete_own_participations" ON challenge_participants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ACHIEVEMENTS (shared) --------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  icon text,
  threshold int NOT NULL DEFAULT 1,
  metric text NOT NULL,
  points int NOT NULL DEFAULT 50,
  tier text NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_achievements" ON achievements;
CREATE POLICY "read_achievements" ON achievements FOR SELECT
  TO authenticated USING (true);

-- USER ACHIEVEMENTS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_achievements" ON user_achievements;
CREATE POLICY "select_own_user_achievements" ON user_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_achievements" ON user_achievements;
CREATE POLICY "insert_own_user_achievements" ON user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_achievements" ON user_achievements;
CREATE POLICY "delete_own_user_achievements" ON user_achievements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- VIDEO ANALYSES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  sport text NOT NULL DEFAULT 'general_fitness',
  video_url text,
  thumbnail_url text,
  duration_seconds int,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  analysis jsonb,
  feedback text,
  score int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_analyses_user ON video_analyses(user_id);

ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_video_analyses" ON video_analyses;
CREATE POLICY "select_own_video_analyses" ON video_analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_video_analyses" ON video_analyses;
CREATE POLICY "insert_own_video_analyses" ON video_analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_video_analyses" ON video_analyses;
CREATE POLICY "update_own_video_analyses" ON video_analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_video_analyses" ON video_analyses;
CREATE POLICY "delete_own_video_analyses" ON video_analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at triggers ----------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_training_plans ON training_plans;
CREATE TRIGGER set_updated_at_training_plans BEFORE UPDATE ON training_plans
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
