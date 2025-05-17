-- Drones Table
create table drones (
  id uuid primary key default gen_random_uuid(),
  drone_id text unique not null,
  status text default 'idle',
  battery numeric default 100,
  location jsonb,
  capabilities jsonb,
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
  status text default 'idle',
  battery numeric,
  altitude numeric,
  phase text,
  eta numeric,
  started_at bigint,
  completed_at bigint,
  assigned_drone_id text references drones(drone_id),
  created_at timestamp with time zone default now()
);
