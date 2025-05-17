-- Drones Table
create table drones (
  id uuid primary key default gen_random_uuid(),
  drone_id text unique not null,
  model text,
  serial_number text unique,
  status text default 'idle',
  health_status text,
  battery numeric default 100,
  location jsonb,
  capabilities jsonb,
  max_payload numeric,
  max_range numeric,
  firmware_version text,
  last_maintenance timestamp with time zone,
  is_active boolean default true,
  assigned_mission_id uuid references missions(id),
  operator_id uuid references users(id),
  created_at timestamp with time zone default now()
);

-- Missions Table
-- DROP TABLE missions; -- Uncomment to reset

create table missions (
  id uuid primary key default gen_random_uuid(),
  drone_id text not null,
  name text not null,
  route jsonb not null,
  current_step int default 0,
  status text default 'idle' check (status in ('idle', 'taking_off', 'in_progress', 'paused', 'aborted', 'completed', 'failed')),
  battery numeric default 100,
  altitude numeric default 0,
  phase text check (phase in ('takeoff', 'cruise', 'delivery', 'returning', 'landing')),
  eta numeric default 0,
  started_at bigint,
  completed_at bigint,
  assigned_drone_id text references drones(drone_id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_missions_updated_at
  before update on missions
  for each row
  execute function update_updated_at_column();
