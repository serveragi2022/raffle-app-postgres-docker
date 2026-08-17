-- ============================================================================
-- Food Safety Challenge Raffle System — Plain PostgreSQL Schema
-- Converted from supabase/migrations/0001_init.sql + 0002_raffle_engine.sql
-- for self-hosted Docker deployment (no Supabase Auth / RLS / PostgREST).
--
-- Authorization is now handled entirely in the Next.js application layer
-- (see lib/auth/session.ts + lib/services/auth.ts) instead of Postgres RLS,
-- since there is no more Supabase Auth "auth.uid()" to key policies off of.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- app_users — replaces Supabase's auth.users + admin_users/viewer_users.
-- One table, role column instead of two allow-list tables.
-- ----------------------------------------------------------------------------
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- raffle_events
-- ----------------------------------------------------------------------------
create table if not exists raffle_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- departments
-- ----------------------------------------------------------------------------
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  raffle_event_id uuid not null references raffle_events(id) on delete cascade,
  department_name text not null,
  created_at timestamptz not null default now(),
  unique (raffle_event_id, department_name)
);

create index if not exists idx_departments_event on departments(raffle_event_id);

-- ----------------------------------------------------------------------------
-- participants
-- ----------------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  raffle_event_id uuid not null references raffle_events(id) on delete cascade,
  department_id uuid not null references departments(id) on delete restrict,
  employee_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_participants_event on participants(raffle_event_id);
create index if not exists idx_participants_department on participants(department_id);
create unique index if not exists uq_participants_name_dept
  on participants (raffle_event_id, department_id, lower(employee_name));

-- ----------------------------------------------------------------------------
-- slot_groups
-- (applies_to_all added — used by the app but was missing from the original
-- migration file; it lets a custom group span every department without
-- exclusively claiming those departments, same semantics as is_all.)
-- ----------------------------------------------------------------------------
create table if not exists slot_groups (
  id uuid primary key default gen_random_uuid(),
  raffle_event_id uuid not null references raffle_events(id) on delete cascade,
  group_name text not null,
  slot_limit int not null check (slot_limit > 0),
  is_all boolean not null default false,
  applies_to_all boolean not null default false,
  created_at timestamptz not null default now(),
  unique (raffle_event_id, group_name)
);

create index if not exists idx_slot_groups_event on slot_groups(raffle_event_id);
create unique index if not exists uq_slot_groups_one_all
  on slot_groups (raffle_event_id) where (is_all);

-- ----------------------------------------------------------------------------
-- slot_group_departments
-- ----------------------------------------------------------------------------
create table if not exists slot_group_departments (
  id uuid primary key default gen_random_uuid(),
  slot_group_id uuid not null references slot_groups(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (slot_group_id, department_id)
);

create index if not exists idx_sgd_slot_group on slot_group_departments(slot_group_id);
create unique index if not exists uq_sgd_department_once
  on slot_group_departments (department_id);

-- ----------------------------------------------------------------------------
-- winners
-- ----------------------------------------------------------------------------
create table if not exists winners (
  id uuid primary key default gen_random_uuid(),
  raffle_event_id uuid not null references raffle_events(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete restrict,
  slot_group_id uuid not null references slot_groups(id) on delete restrict,
  department_id uuid not null references departments(id) on delete restrict,
  drawn_at timestamptz not null default now(),
  unique (raffle_event_id, participant_id)
);

create index if not exists idx_winners_event on winners(raffle_event_id);
create index if not exists idx_winners_slot_group on winners(slot_group_id);

-- ----------------------------------------------------------------------------
-- raffle_actions — audit log (performed_by now points at app_users)
-- ----------------------------------------------------------------------------
create table if not exists raffle_actions (
  id uuid primary key default gen_random_uuid(),
  raffle_event_id uuid not null references raffle_events(id) on delete cascade,
  action_type text not null check (action_type in ('draw', 'redraw', 'skip', 'reset')),
  slot_group_id uuid references slot_groups(id) on delete set null,
  participant_id uuid references participants(id) on delete set null,
  performed_by uuid references app_users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_raffle_actions_event on raffle_actions(raffle_event_id);

-- ----------------------------------------------------------------------------
-- raffle_settings
-- ----------------------------------------------------------------------------
create table if not exists raffle_settings (
  raffle_event_id uuid primary key references raffle_events(id) on delete cascade,
  dark_mode boolean not null default false,
  animation_speed text not null default 'normal' check (animation_speed in ('slow', 'normal', 'fast')),
  spin_duration_ms int not null default 4000,
  sound_enabled boolean not null default true,
  confetti_enabled boolean not null default true,
  company_logo_url text,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Helper view: eligible participants per slot group (ad-hoc admin queries).
-- The actual eligibility logic used by the app lives in eligible_participants()
-- below.
-- ============================================================================
create or replace view v_slot_group_fill as
select
  sg.id as slot_group_id,
  sg.raffle_event_id,
  sg.group_name,
  sg.slot_limit,
  sg.is_all,
  count(w.id) as winners_drawn,
  (sg.slot_limit - count(w.id)) as slots_remaining
from slot_groups sg
left join winners w on w.slot_group_id = sg.id
group by sg.id;

-- ============================================================================
-- Raffle Engine — atomic, race-safe draw / redraw / skip / reset functions.
-- Unchanged from supabase/migrations/0002_raffle_engine.sql: these are plain
-- plpgsql functions with no Supabase-specific dependencies, so they port
-- as-is to plain Postgres. Only the trailing `grant ... to authenticated`
-- statements (a Supabase/PostgREST role) are dropped, since the app now
-- connects with its own dedicated database role that already owns these
-- objects.
-- ============================================================================

create or replace function eligible_participants(
  p_raffle_event_id uuid,
  p_slot_group_id uuid
)
returns table (participant_id uuid, employee_name text, department_id uuid, department_name text)
language plpgsql
stable
as $$
declare
  v_is_all boolean;
  v_slot_limit int;
  v_winners_count int;
begin
  select is_all, slot_limit into v_is_all, v_slot_limit
  from slot_groups where id = p_slot_group_id and raffle_event_id = p_raffle_event_id;

  if not found then
    raise exception 'Slot group % not found for event %', p_slot_group_id, p_raffle_event_id;
  end if;

  select count(*) into v_winners_count from winners where slot_group_id = p_slot_group_id;

  if v_winners_count >= v_slot_limit then
    return;
  end if;

  if not v_is_all then
    return query
      select p.id, p.employee_name, p.department_id, d.department_name
      from participants p
      join departments d on d.id = p.department_id
      join slot_group_departments sgd on sgd.department_id = p.department_id
      where p.raffle_event_id = p_raffle_event_id
        and sgd.slot_group_id = p_slot_group_id
        and p.id not in (select w.participant_id from winners w where w.raffle_event_id = p_raffle_event_id);
  else
    -- ALL DEPARTMENTS should draw from every remaining participant in the event,
    -- regardless of other slot groups. The "already won" check is the only
    -- eligibility gate for the ALL group; department caps are enforced by the
    -- group-specific non-ALL queries instead.
    return query
      select p.id, p.employee_name, p.department_id, d.department_name
      from participants p
      join departments d on d.id = p.department_id
      where p.raffle_event_id = p_raffle_event_id
        and p.id not in (select w.participant_id from winners w where w.raffle_event_id = p_raffle_event_id);
  end if;
end;
$$;

create or replace function draw_winner(
  p_raffle_event_id uuid,
  p_slot_group_id uuid,
  p_performed_by uuid default null
)
returns table (
  winner_id uuid,
  participant_id uuid,
  employee_name text,
  department_id uuid,
  department_name text,
  slot_group_id uuid,
  group_name text,
  drawn_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_participant_id uuid;
  v_employee_name text;
  v_department_id uuid;
  v_department_name text;
  v_winner_id uuid;
  v_drawn_at timestamptz;
  v_group_name text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_raffle_event_id::text, 0));

  select ep.participant_id, ep.employee_name, ep.department_id, ep.department_name
  into v_participant_id, v_employee_name, v_department_id, v_department_name
  from eligible_participants(p_raffle_event_id, p_slot_group_id) ep
  order by random()
  limit 1;

  if v_participant_id is null then
    raise exception 'NO_ELIGIBLE_PARTICIPANTS' using errcode = 'P0001';
  end if;

  select sg.group_name into v_group_name from slot_groups sg where sg.id = p_slot_group_id;

  insert into winners (raffle_event_id, participant_id, slot_group_id, department_id)
  values (p_raffle_event_id, v_participant_id, p_slot_group_id, v_department_id)
  returning id, drawn_at into v_winner_id, v_drawn_at;

  insert into raffle_actions (raffle_event_id, action_type, slot_group_id, participant_id, performed_by, metadata)
  values (p_raffle_event_id, 'draw', p_slot_group_id, v_participant_id, p_performed_by,
          jsonb_build_object('winner_id', v_winner_id));

  return query select v_winner_id, v_participant_id, v_employee_name, v_department_id,
    v_department_name, p_slot_group_id, v_group_name, v_drawn_at;
end;
$$;

create or replace function redraw_winner(
  p_raffle_event_id uuid,
  p_slot_group_id uuid,
  p_performed_by uuid default null
)
returns table (
  winner_id uuid,
  participant_id uuid,
  employee_name text,
  department_id uuid,
  department_name text,
  slot_group_id uuid,
  group_name text,
  drawn_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_last_winner_id uuid;
  v_last_participant_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_raffle_event_id::text, 0));

  select w.id, w.participant_id into v_last_winner_id, v_last_participant_id
  from winners w
  where w.raffle_event_id = p_raffle_event_id and w.slot_group_id = p_slot_group_id
  order by w.drawn_at desc
  limit 1;

  if v_last_winner_id is null then
    raise exception 'NO_WINNER_TO_REDRAW' using errcode = 'P0001';
  end if;

  delete from winners where id = v_last_winner_id;

  insert into raffle_actions (raffle_event_id, action_type, slot_group_id, participant_id, performed_by, metadata)
  values (p_raffle_event_id, 'redraw', p_slot_group_id, v_last_participant_id, p_performed_by,
          jsonb_build_object('replaced_winner_id', v_last_winner_id));

  return query select * from draw_winner(p_raffle_event_id, p_slot_group_id, p_performed_by);
end;
$$;

create or replace function skip_draw(
  p_raffle_event_id uuid,
  p_slot_group_id uuid,
  p_performed_by uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into raffle_actions (raffle_event_id, action_type, slot_group_id, performed_by)
  values (p_raffle_event_id, 'skip', p_slot_group_id, p_performed_by);
end;
$$;

create or replace function reset_raffle(
  p_raffle_event_id uuid,
  p_performed_by uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_raffle_event_id::text, 0));

  delete from winners where raffle_event_id = p_raffle_event_id;

  insert into raffle_actions (raffle_event_id, action_type, performed_by)
  values (p_raffle_event_id, 'reset', p_performed_by);

  update raffle_events set status = 'draft' where id = p_raffle_event_id;
end;
$$;

-- No default admin user is seeded here (a real bcrypt hash needs to be
-- generated, not hand-typed). Run `npm run seed:admin` after the container
-- is up — it reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment,
-- hashes the password with bcryptjs, and inserts the first admin. See
-- scripts/seed-admin.mjs and README-DEPLOY.md.
