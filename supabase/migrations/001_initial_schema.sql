-- ============================================================
-- HangarStack Database Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Workspaces (one per flight school / FBO location) ───────────────────────

create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  airport_code text,
  created_at  timestamptz default now()
);

-- ─── Aircraft Templates (seeded from API Ninjas) ─────────────────────────────

create table if not exists aircraft_templates (
  id              uuid primary key default gen_random_uuid(),
  manufacturer    text not null,
  model           text not null,
  engine_type     text not null default 'Piston',
  wingspan_ft     numeric not null,
  length_ft       numeric not null,
  height_ft       numeric not null,
  gross_weight_lbs  numeric,
  empty_weight_lbs  numeric,
  max_airspeed_kts  numeric,
  cruise_speed_kts  numeric,
  range_nm          numeric,
  is_custom       boolean default false,
  created_at      timestamptz default now(),
  unique(manufacturer, model)
);

-- ─── Aircraft (real aircraft in a workspace fleet) ────────────────────────────

create table if not exists aircraft (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid references workspaces(id) on delete cascade,
  template_id     uuid references aircraft_templates(id),
  tail_number     text not null,
  callsign        text,
  manufacturer    text not null,
  model           text not null,
  wingspan_ft     numeric not null,
  length_ft       numeric not null,
  height_ft       numeric not null,
  engine_type     text not null default 'Piston',
  owner_name      text,
  owner_contact   text,
  status          text not null default 'available'
                  check (status in ('available','scheduled','maintenance','grounded','dispatch_ready','owner_use','transient')),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(workspace_id, tail_number)
);

-- ─── Hangars ──────────────────────────────────────────────────────────────────

create table if not exists hangars (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  name          text not null,
  width_ft      numeric not null,
  depth_ft      numeric not null,
  polygon_pts   jsonb,           -- null = simple rectangle
  doors         jsonb not null default '[]',
  obstructions  jsonb not null default '[]',
  clearance_ft  numeric not null default 3,
  sort_order    int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Aircraft Placements ──────────────────────────────────────────────────────

create table if not exists aircraft_placements (
  id              uuid primary key default gen_random_uuid(),
  hangar_id       uuid references hangars(id) on delete cascade,
  aircraft_id     uuid references aircraft(id) on delete cascade,
  x_ft            numeric not null default 0,
  y_ft            numeric not null default 0,
  rotation_deg    numeric not null default 0,
  dispatch_order  int,
  departure_time  timestamptz,
  return_time     timestamptz,
  updated_at      timestamptz default now(),
  unique(hangar_id, aircraft_id)   -- one placement per aircraft per hangar
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- For beta, keep it simple: authenticated users can read/write their workspace.
-- Tighten this before going to production.

alter table workspaces         enable row level security;
alter table aircraft_templates enable row level security;
alter table aircraft           enable row level security;
alter table hangars            enable row level security;
alter table aircraft_placements enable row level security;

-- Templates are public read (anyone can search the library)
create policy "Templates: public read"
  on aircraft_templates for select using (true);

create policy "Templates: authenticated insert"
  on aircraft_templates for insert
  with check (auth.role() = 'authenticated');

-- For other tables, authenticated users can do everything for beta
-- (replace with workspace-scoped policies before launch)
create policy "Workspaces: auth full access"
  on workspaces for all using (auth.role() = 'authenticated');

create policy "Aircraft: auth full access"
  on aircraft for all using (auth.role() = 'authenticated');

create policy "Hangars: auth full access"
  on hangars for all using (auth.role() = 'authenticated');

create policy "Placements: auth full access"
  on aircraft_placements for all using (auth.role() = 'authenticated');

-- ─── Seed: Demo workspace + Pilot Makers hangars ──────────────────────────────

insert into workspaces (id, name, airport_code)
values ('00000000-0000-0000-0000-000000000001', 'Pilot Makers', 'KPVU')
on conflict do nothing;

insert into hangars (workspace_id, name, width_ft, depth_ft, sort_order, doors, obstructions)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Hangar 1',
    120, 80, 0,
    '[{"id":"d1","wall":"bottom","position_pct":0.5,"width_ft":60,"height_ft":16,"label":"Main Door"}]',
    '[]'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Hangar 2',
    100, 70, 1,
    '[{"id":"d2","wall":"bottom","position_pct":0.5,"width_ft":50,"height_ft":14,"label":"Main Door"}]',
    '[]'
  )
on conflict do nothing;

-- ─── Updated_at trigger ───────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger aircraft_updated_at
  before update on aircraft
  for each row execute function set_updated_at();

create trigger hangars_updated_at
  before update on hangars
  for each row execute function set_updated_at();

create trigger placements_updated_at
  before update on aircraft_placements
  for each row execute function set_updated_at();
