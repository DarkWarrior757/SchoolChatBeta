-- Add Discord-style "about me" field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about text;

-- Backfill from bio for existing users so nobody starts empty
UPDATE profiles SET about = bio WHERE about IS NULL AND bio IS NOT NULL;
