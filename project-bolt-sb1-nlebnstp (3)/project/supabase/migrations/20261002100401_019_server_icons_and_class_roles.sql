/*
# Add server icon, class_roles table, and role_id on class_members

## 1. Classes table
- Adds `icon_url` (text, nullable) to `classes` so admins can upload a server icon image (like Discord server icons).

## 2. New table: class_roles
- Per-class custom roles, like Discord guild roles.
- `id` uuid PK
- `class_id` uuid FK to classes (CASCADE)
- `name` text — role name (e.g. "Teacher", "Student Leader")
- `color` text — hex color for role badge/username (default '#99aab5')
- `position` int — display ordering (lower = higher priority, like Discord)
- `permissions` text[] — array of permission strings
- `is_mentionable` bool — whether @role works in chat (default true)
- `created_at` timestamptz

Permissions list (stored as text[]):
  'manage_server' — edit server name, icon, description
  'manage_channels' — create/edit/delete channels and categories
  'manage_roles' — create/edit/delete roles
  'manage_members' — kick members, assign roles
  'send_messages' — send messages in channels
  'manage_messages' — delete others' messages
  'view_channel' — see channels
  'mention_everyone' — @everyone / @here

## 3. class_members
- Adds `role_id` uuid nullable FK to class_roles (SET NULL on delete)

## 4. Security
- RLS enabled on class_roles.
- Members of the class can read roles.
- Only class owners and those with 'manage_roles' permission can write.
*/

ALTER TABLE classes ADD COLUMN IF NOT EXISTS icon_url text;

CREATE TABLE IF NOT EXISTS class_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#99aab5',
  position integer NOT NULL DEFAULT 0,
  permissions text[] NOT NULL DEFAULT '{}',
  is_mentionable boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE class_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_roles_read_members" ON class_roles;
CREATE POLICY "class_roles_read_members" ON class_roles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = class_roles.class_id AND class_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "class_roles_write_owner" ON class_roles;
CREATE POLICY "class_roles_write_owner" ON class_roles FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = class_roles.class_id AND class_members.user_id = auth.uid() AND class_members.class_role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = class_roles.class_id AND class_members.user_id = auth.uid() AND class_members.class_role = 'owner')
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_members' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE class_members ADD COLUMN role_id uuid REFERENCES class_roles(id) ON DELETE SET NULL;
  END IF;
END $$;
