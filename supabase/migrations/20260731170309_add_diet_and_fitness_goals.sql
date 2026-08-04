/*
# Add diet preference to profiles and create fitness_goals table

1. Modified Tables
   - `profiles` — adds `diet_preference` column (vegetarian, vegan, non-vegetarian, pescatarian, keto, other)

2. New Tables
   - `fitness_goals` — user-defined goals for steps, calories, sleep, hydration, weight, etc.
     Columns: id, user_id, metric (steps/calories_burned/calories_consumed/sleep_hours/hydration_ml/weight_kg/custom),
     target_value, target_unit, goal_name, period (daily/weekly/monthly), active, created_at

3. Security
   - RLS enabled on fitness_goals with owner-scoped policies for authenticated users
*/

-- Add diet_preference column to profiles if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'diet_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diet_preference text NOT NULL DEFAULT 'non-vegetarian';
  END IF;
END $$;

-- Fitness goals table
CREATE TABLE IF NOT EXISTS fitness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name text NOT NULL,
  metric text NOT NULL,
  target_value numeric NOT NULL,
  target_unit text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_fitness_goals" ON fitness_goals;
CREATE POLICY "select_own_fitness_goals" ON fitness_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_fitness_goals" ON fitness_goals;
CREATE POLICY "insert_own_fitness_goals" ON fitness_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_fitness_goals" ON fitness_goals;
CREATE POLICY "update_own_fitness_goals" ON fitness_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_fitness_goals" ON fitness_goals;
CREATE POLICY "delete_own_fitness_goals" ON fitness_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
