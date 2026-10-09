/*
# Site owner setup, ban/mute enforcement, and admin powers

1. Profile changes
- Add `is_banned` (boolean, default false) and `is_muted` (boolean, default false) columns to profiles
- Banned users cannot send messages in any channel
- Muted users cannot send messages in a specific class (via class_members.is_muted_in_class)
- Add `is_muted_in_class` (boolean, default false) to class_members for per-group muting
2. Owner setup
- Set avirajprashar10@gmail.com (id 9355def1-4bc7-4f8a-a4bf-130265ab29e1) as class_role='owner' in every class
- Add him to Class 8 (the only class he's not a member of yet) as owner
- Ensure his profile role is 'admin'
3. New functions
- `admin_ban_user(target_uuid)`: site admin bans a user (sets is_banned=true)
- `admin_unban_user(target_uuid)`: site admin unbans a user
- `admin_mute_user_in_class(class_uuid, target_uuid)`: site admin or class owner mutes a user in a class
- `admin_unmute_user_in_class(class_uuid, target_uuid)`: site admin or class owner unmutes
- `admin_set_class_owner(class_uuid, target_uuid)`: site admin sets any user as owner of a class
4. Policy changes
- messages INSERT: reject if author is banned globally
- messages INSERT: reject if author is muted in the class that owns the channel
- direct_messages INSERT: reject if sender is banned globally
5. RLS
- Profiles SELECT stays open to all authenticated (so users can see ban status)
- Profiles UPDATE: only the user themselves or a site admin can update
- class_members UPDATE: site admin can update any row (needed for mute/owner changes)
*/

-- 1. Add ban/mute columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false;

-- 2. Add per-class mute to class_members
ALTER TABLE class_members ADD COLUMN IF NOT EXISTS is_muted_in_class boolean NOT NULL DEFAULT false;

-- 3. Set aviraj as admin and owner of all classes
UPDATE profiles SET role = 'admin', updated_at = now() WHERE email = 'avirajprashar10@gmail.com';

-- Set him as owner in classes he's already a member of
UPDATE class_members SET class_role = 'owner', role = 'admin'
WHERE user_id = '9355def1-4bc7-4f8a-a4bf-130265ab29e1';

-- Add him to Class 8 as owner (he's not a member yet)
INSERT INTO class_members (class_id, user_id, role, class_role)
SELECT '5be21d9c-e715-4438-acfe-b11b5ebc4dee', '9355def1-4bc7-4f8a-a4bf-130265ab29e1', 'admin', 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM class_members
  WHERE class_id = '5be21d9c-e715-4438-acfe-b11b5ebc4dee'
  AND user_id = '9355def1-4bc7-4f8a-a4bf-130265ab29e1'
);

-- 4. Admin ban function
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can ban users.';
  END IF;
  IF auth.uid() = target_uuid THEN
    RAISE EXCEPTION 'You cannot ban yourself.';
  END IF;
  UPDATE profiles SET is_banned = true, status = 'offline', updated_at = now() WHERE id = target_uuid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid) TO authenticated;

-- 5. Admin unban function
CREATE OR REPLACE FUNCTION public.admin_unban_user(target_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can unban users.';
  END IF;
  UPDATE profiles SET is_banned = false, updated_at = now() WHERE id = target_uuid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

-- 6. Admin mute user in a class (site admin or class owner)
CREATE OR REPLACE FUNCTION public.admin_mute_user_in_class(class_uuid uuid, target_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_site_admin(auth.uid()) OR public.is_class_owner(class_uuid, auth.uid())) THEN
    RAISE EXCEPTION 'Only administrators or class owners can mute users.';
  END IF;
  IF auth.uid() = target_uuid THEN
    RAISE EXCEPTION 'You cannot mute yourself.';
  END IF;
  UPDATE class_members SET is_muted_in_class = true
    WHERE class_id = class_uuid AND user_id = target_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not a member of this class.';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_mute_user_in_class(uuid, uuid) TO authenticated;

-- 7. Admin unmute user in a class
CREATE OR REPLACE FUNCTION public.admin_unmute_user_in_class(class_uuid uuid, target_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_site_admin(auth.uid()) OR public.is_class_owner(class_uuid, auth.uid())) THEN
    RAISE EXCEPTION 'Only administrators or class owners can unmute users.';
  END IF;
  UPDATE class_members SET is_muted_in_class = false
    WHERE class_id = class_uuid AND user_id = target_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not a member of this class.';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unmute_user_in_class(uuid, uuid) TO authenticated;

-- 8. Admin set class owner (site admin only — overrides existing set_class_owner which requires current owner)
CREATE OR REPLACE FUNCTION public.admin_set_class_owner(class_uuid uuid, target_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only site administrators can assign class owners.';
  END IF;
  -- Demote current owner to member
  UPDATE class_members SET class_role = 'member'
    WHERE class_id = class_uuid AND class_role = 'owner';
  -- Promote target to owner (insert if not a member yet)
  INSERT INTO class_members (class_id, user_id, role, class_role)
  VALUES (class_uuid, target_uuid, 'student', 'owner')
  ON CONFLICT (class_id, user_id) DO UPDATE SET class_role = 'owner';
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_class_owner(uuid, uuid) TO authenticated;

-- 9. Update messages INSERT policy to reject banned users and muted-in-class users
DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
    AND EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = messages.channel_id
      AND (
        is_class_staff(channels.class_id, auth.uid())
        OR (
          is_class_member(channels.class_id, auth.uid())
          AND channels.type NOT IN ('announcement', 'read_only')
          AND NOT EXISTS (
            SELECT 1 FROM class_members
            WHERE class_id = channels.class_id
            AND user_id = auth.uid()
            AND is_muted_in_class = true
          )
        )
      )
    )
  );

-- 10. Update direct_messages INSERT policy to reject banned users
DROP POLICY IF EXISTS "direct_messages_insert_participant" ON direct_messages;
CREATE POLICY "direct_messages_insert_participant" ON direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
    AND is_dm_participant(conversation_id, auth.uid())
  );

-- 11. Allow site admins to update any class_members row (for mute/owner changes done via RPC)
-- The existing class_members_update_staff policy only allows staff; we need admin too
DROP POLICY IF EXISTS "class_members_update_staff" ON class_members;
CREATE POLICY "class_members_update_staff_or_admin" ON class_members
  FOR UPDATE TO authenticated
  USING (
    is_class_staff(class_id, auth.uid())
    OR is_site_admin(auth.uid())
  )
  WITH CHECK (
    is_class_staff(class_id, auth.uid())
    OR is_site_admin(auth.uid())
  );

-- 12. Allow profiles to be updated by site admin (for ban/unban via direct update if needed)
-- The existing profiles_update_own only allows self-update; admins need access too
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR is_site_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_site_admin(auth.uid()));
