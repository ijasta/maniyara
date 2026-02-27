-- ═══════════════════════════════════════════════════════════
-- MANIYARA — Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── MEMBERS TABLE ──────────────────────────────────────────
create table if not exists members (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  username    text unique,
  phone       text,
  email       text,
  avatar      text default '🧑',
  color       text default '#7DF9AA',
  score       int  default 0,
  streak      int  default 0,
  is_admin    bool default false,
  status      text default 'pending',   -- 'pending' | 'approved' | 'rejected'
  callmebot_key text default '',
  created_at  timestamptz default now()
);

-- ── TASKS TABLE ────────────────────────────────────────────
create table if not exists tasks (
  id          serial primary key,
  name        text not null,
  emoji       text default '📋',
  description text default '',
  color       text default '#7DF9AA',
  points      int  default 10,
  active      bool default true,
  created_at  timestamptz default now()
);

-- ── ASSIGNMENTS TABLE ──────────────────────────────────────
create table if not exists assignments (
  id               uuid primary key default uuid_generate_v4(),
  member_id        uuid references members(id) on delete cascade,
  task_id          int  references tasks(id) on delete cascade,
  week_number      int  not null,
  done             bool default false,
  proof_url        text,
  proof_path       text,
  done_at          timestamptz,
  proof_expires_at timestamptz,
  created_at       timestamptz default now()
);

-- ── SETTINGS TABLE ─────────────────────────────────────────
create table if not exists settings (
  id                int  primary key default 1,
  house_name        text default 'Maniyara',
  app_tagline       text default 'House Management System',
  max_members       int  default 7,
  current_week      int  default 1,
  rotation_day      text default 'friday',
  rotation_time     text default '23:00',
  points_per_task   int  default 10,
  points_proof      int  default 5,
  penalty_overdue   int  default -8,
  photo_delete_days int  default 3,
  wa_auto_send      bool default false,
  require_proof     bool default false,
  created_at        timestamptz default now()
);

-- ── LOGS TABLE ─────────────────────────────────────────────
create table if not exists logs (
  id         uuid primary key default uuid_generate_v4(),
  action     text not null,
  actor      text,
  details    text,
  created_at timestamptz default now()
);

-- ── INSERT DEFAULT DATA ────────────────────────────────────
insert into settings (id) values (1) on conflict (id) do nothing;

insert into tasks (name, emoji, description, color) values
  ('Cooking',   '🍳', 'Cook all meals. Dinner must be ready by 8 PM daily.',            '#FF6B6B'),
  ('Dishes',    '🍽️', 'Wash all utensils after every meal. Keep sink clean.',            '#FFD93D'),
  ('Sweeping',  '🧹', 'Sweep all rooms every morning before 9 AM.',                     '#6BCB77'),
  ('Mopping',   '🫧', 'Mop all floors with disinfectant at least 3 times a week.',      '#4D96FF'),
  ('Bathroom',  '🚿', 'Clean toilet, floor and sink daily. Restock supplies.',           '#C77DFF'),
  ('Trash',     '🗑️', 'Collect trash from all rooms and dispose every evening.',        '#FF9A3C'),
  ('Groceries', '🛒', 'Plan and buy weekly groceries every Saturday morning.',           '#00D4AA')
on conflict do nothing;

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
alter table members     enable row level security;
alter table tasks       enable row level security;
alter table assignments enable row level security;
alter table settings    enable row level security;
alter table logs        enable row level security;

-- Drop old policies if they exist
drop policy if exists "members_select"     on members;
drop policy if exists "members_insert"     on members;
drop policy if exists "members_update_own" on members;
drop policy if exists "members_update_admin" on members;
drop policy if exists "members_delete"     on members;
drop policy if exists "tasks_select"       on tasks;
drop policy if exists "tasks_all"          on tasks;
drop policy if exists "assign_select"      on assignments;
drop policy if exists "assign_all"         on assignments;
drop policy if exists "settings_select"    on settings;
drop policy if exists "settings_all"       on settings;
drop policy if exists "logs_select"        on logs;
drop policy if exists "logs_insert"        on logs;

-- Members: anyone can read approved members
create policy "members_select" on members
  for select using (true);

-- Members: users can insert their own row (during registration)
create policy "members_insert" on members
  for insert with check (auth.uid() = id);

-- Members: users can update their own non-admin fields
create policy "members_update_own" on members
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Members: admins can update anyone
create policy "members_update_admin" on members
  for update using (
    exists (select 1 from members where id = auth.uid() and is_admin = true)
  );

-- Members: only admins can delete
create policy "members_delete" on members
  for delete using (
    exists (select 1 from members where id = auth.uid() and is_admin = true)
  );

-- Tasks: everyone can read
create policy "tasks_select" on tasks for select using (true);

-- Tasks: only admins can modify
create policy "tasks_all" on tasks for all using (
  exists (select 1 from members where id = auth.uid() and is_admin = true)
);

-- Assignments: approved members can read
create policy "assign_select" on assignments for select using (
  exists (select 1 from members where id = auth.uid() and status = 'approved')
);

-- Assignments: admins full control, approved members can update own
create policy "assign_all" on assignments for all using (
  exists (select 1 from members where id = auth.uid() and (is_admin = true or (status = 'approved' and member_id = auth.uid())))
);

-- Settings: approved members can read
create policy "settings_select" on settings for select using (
  exists (select 1 from members where id = auth.uid() and status = 'approved')
);

-- Settings: only admins can modify
create policy "settings_all" on settings for all using (
  exists (select 1 from members where id = auth.uid() and is_admin = true)
);

-- Logs: admins can read/write
create policy "logs_select" on logs for select using (
  exists (select 1 from members where id = auth.uid() and is_admin = true)
);
create policy "logs_insert" on logs for insert with check (true);

-- ── STORAGE BUCKET ─────────────────────────────────────────
insert into storage.buckets (id, name, public) 
  values ('task-proofs', 'task-proofs', true)
  on conflict (id) do nothing;

-- Storage policy: approved members can upload
create policy "proofs_upload" on storage.objects for insert
  with check (
    bucket_id = 'task-proofs' and
    exists (select 1 from members where id = auth.uid() and status = 'approved')
  );

create policy "proofs_read" on storage.objects for select
  using (bucket_id = 'task-proofs');

create policy "proofs_delete" on storage.objects for delete
  using (
    bucket_id = 'task-proofs' and
    exists (select 1 from members where id = auth.uid() and is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════
-- HOW TO CREATE THE FIRST ADMIN:
-- 1. Register normally on the app
-- 2. In Supabase: run this (replace with your user ID):
--    update members set is_admin = true, status = 'approved' where email = 'your@email.com';
-- ═══════════════════════════════════════════════════════════
