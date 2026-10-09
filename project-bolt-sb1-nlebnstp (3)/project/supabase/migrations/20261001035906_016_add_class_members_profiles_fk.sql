-- Add missing foreign key from class_members.user_id to profiles.id
-- This allows Supabase client to use select('*, profiles(*)') on class_members
ALTER TABLE class_members
  ADD CONSTRAINT class_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
