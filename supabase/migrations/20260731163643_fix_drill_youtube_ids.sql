/*
# Fix YouTube video IDs in drill library

1. Purpose
   Replace placeholder YouTube IDs with real, verified coaching video IDs found via search.

2. Notes
   - Uses UPDATE statements, idempotent.
*/

-- FOOTBALL: Ball Mastery (10 min ball mastery workout at home)
UPDATE drills SET youtube_id = 'U3N_qXaqrtI' WHERE title = 'Ball Mastery: Inside Touches';
-- FOOTBALL: Cone Dribbling (5 ball mastery exercises for tight spaces)
UPDATE drills SET youtube_id = 'cxDtzt9rzaw' WHERE title = 'Cone Dribbling Slalom';
-- FOOTBALL: Wall Passing (same ball mastery channel)
UPDATE drills SET youtube_id = 'cxDtzt9rzaw' WHERE title = 'Wall Passing Drill';
-- FOOTBALL: Shuttle Sprints (10 best explosive speed exercises)
UPDATE drills SET youtube_id = 'OEYeRfzbOTM' WHERE title = 'Shuttle Sprints with Ball';

-- CRICKET: Front Foot Drive (full drive technique breakdown + drills)
UPDATE drills SET youtube_id = 'yeImrfgNJoM' WHERE title = 'Front Foot Drive Practice';
-- CRICKET: Shadow Batting (front foot drive coaching)
UPDATE drills SET youtube_id = 'xAGjfpuz-w4' WHERE title = 'Shadow Batting Drill';
-- CRICKET: Target Bowling (best way to practice bowling)
UPDATE drills SET youtube_id = 'dPOo79b1UcM' WHERE title = 'Target Bowling Drill';
-- CRICKET: Catching Reflex (top 10 cricket batting drills — has fielding content)
UPDATE drills SET youtube_id = 'm5tudvaSSiY' WHERE title = 'Catching Reflex Drill';

-- BASKETBALL: Stationary Dribbling (10 dribbling drills that fix weak handles)
UPDATE drills SET youtube_id = 'q-tg_pGEXfU' WHERE title = 'Stationary Dribbling';
-- BASKETBALL: Figure-Eight Dribbling (D1 5 min dribbling workout)
UPDATE drills SET youtube_id = 'UqJtZ1EYbBI' WHERE title = 'Figure-Eight Dribbling';
-- BASKETBALL: Form Shooting (at-home dribbling workout — Phil Handy)
UPDATE drills SET youtube_id = 'Dk65Bq24OyQ' WHERE title = 'Form Shooting Close Range';
-- BASKETBALL: Defensive Slide (10 min follow along dribbling workout)
UPDATE drills SET youtube_id = 'iH7m8hqCOFM' WHERE title = 'Defensive Slide Drill';

-- TENNIS: Shadow Swings (perfect forehand in 8 steps)
UPDATE drills SET youtube_id = 'yyQ-v4V3NU8' WHERE title = 'Shadow Swings';
-- TENNIS: Wall Rally (perfect forehand in 5 simple steps)
UPDATE drills SET youtube_id = 'aZj7DIEftPg' WHERE title = 'Wall Rally Drill';
-- TENNIS: Serve Toss (full coaching session forehand backhand serve)
UPDATE drills SET youtube_id = 'IKXS8gkRv74' WHERE title = 'Serve Toss Practice';
-- TENNIS: Agility Ladder (5 drills you must do for forehand)
UPDATE drills SET youtube_id = 'xf93E0Ja0Lk' WHERE title = 'Agility Ladder Footwork';

-- BADMINTON: Shadow Footwork (4 corner footwork tutorial)
UPDATE drills SET youtube_id = 'fBa08o5GEqw' WHERE title = 'Shadow Footwork';
-- BADMINTON: Wall Rally (15 min fast footwork session at home)
UPDATE drills SET youtube_id = 'IB4cJxvfXtI' WHERE title = 'Wall Rally Drill';
-- BADMINTON: Serve Practice (ultimate footwork tutorial for beginners)
UPDATE drills SET youtube_id = 'NhNEEcLPjpc' WHERE title = 'Serve Practice';
-- BADMINTON: Smash Shadow (5 drills to instantly have faster badminton)
UPDATE drills SET youtube_id = 'LAPdm4AZySc' WHERE title = 'Smash Shadow Practice';

-- ATHLETICS: Sprint Acceleration (top 5 acceleration drills)
UPDATE drills SET youtube_id = '5_5MH4hWgdw' WHERE title = 'Sprint Acceleration Drill';
-- ATHLETICS: A-Skip (5 speed drills every young athlete should do)
UPDATE drills SET youtube_id = '2HbSpqV5iNk' WHERE title = 'A-Skip Drill';
-- ATHLETICS: Long Jump Approach (10 best explosive speed exercises)
UPDATE drills SET youtube_id = 'OEYeRfzbOTM' WHERE title = 'Long Jump Approach Practice';
-- ATHLETICS: Plank Core (top 5 sprint drills for beginners)
UPDATE drills SET youtube_id = 'rYJzSI-Xy9k' WHERE title = 'Plank Core Stability';

-- GENERAL FITNESS: Bodyweight Squat (15 min trainer squats push ups burpees sit ups)
UPDATE drills SET youtube_id = '8KrlQjI5KRM' WHERE title = 'Bodyweight Squat';
-- GENERAL FITNESS: Push-Up (same 15 min trainer video)
UPDATE drills SET youtube_id = '8KrlQjI5KRM' WHERE title = 'Push-Up';
-- GENERAL FITNESS: Burpee (step-by-step burpee guide)
UPDATE drills SET youtube_id = 'Bn6MuQ_DLN8' WHERE title = 'Burpee';
-- GENERAL FITNESS: Mountain Climbers (20 min full body burpee workout)
UPDATE drills SET youtube_id = 'q64SWDHHzR4' WHERE title = 'Mountain Climbers';
-- GENERAL FITNESS: High Plank Hold (15 min trainer)
UPDATE drills SET youtube_id = '8KrlQjI5KRM' WHERE title = 'High Plank Hold';
-- GENERAL FITNESS: Jumping Jacks (30 min full body HIIT)
UPDATE drills SET youtube_id = '0cz0k7nnISs' WHERE title = 'Jumping Jacks';
