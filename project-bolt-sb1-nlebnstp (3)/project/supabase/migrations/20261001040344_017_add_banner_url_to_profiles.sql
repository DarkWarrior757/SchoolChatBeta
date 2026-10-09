/*
# Add banner_url column to profiles

1. Changes
- Adds `banner_url` (text, nullable) to `profiles` so users can set a GIF or image banner on their profile, like Discord.
- Existing rows remain NULL (no banner by default).
2. Security
- No new RLS needed; the existing profiles_update_own_or_admin policy already covers the new column since it grants UPDATE on the row level.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
