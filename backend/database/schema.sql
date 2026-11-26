-- NexDesk: esquema PostgreSQL (Supabase). Idempotente: se puede ejecutar varias veces.
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,          -- auth.users.id de Supabase
  full_name text not null,
  email text not null unique
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('admin','tecnico','empleado')),
  unique (user_id, organization_id)
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reported_by uuid not null references users(id),
  assigned_to uuid references users(id),
  title text not null,
  description text not null,
  category text not null default 'general',
  priority text not null default 'media' check (priority in ('baja','media','alta','critica')),
  status text not null default 'abierto' check (status in ('abierto','en_progreso','en_espera','resuelto','cerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_org_idx on tickets (organization_id, status);
create index if not exists tickets_reporter_idx on tickets (reported_by);

create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  stripe_event_id text not null unique,        -- idempotencia de webhooks
  amount int not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- Seguridad: RLS activo sin políticas => la API pública de Supabase (anon key) no ve nada.
-- El backend se conecta con DATABASE_URL (rol postgres) y aplica la autorización.
alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_members enable row level security;
alter table tickets enable row level security;
alter table ticket_comments enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
