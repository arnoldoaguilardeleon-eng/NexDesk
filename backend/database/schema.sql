
-- =====================================================
-- NexDesk
-- Esquema PostgreSQL completo
-- Referencia técnica basada en Avance 1
--
-- IMPORTANTE:
-- Este archivo representa el esquema completo.
-- No ejecutarlo directamente sobre una BD existente.
-- Para cambios incrementales utilizar migrations/.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================

CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. USERS
-- =====================================================

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. ORGANIZATION MEMBERS
-- =====================================================

CREATE TABLE public.organization_members (
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL
        CHECK (role IN ('employee', 'technician', 'admin')),
    PRIMARY KEY (organization_id, user_id)
);

-- =====================================================
-- 4. TICKETS
-- =====================================================

CREATE TABLE public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number bigint GENERATED ALWAYS AS IDENTITY,
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id),
    reported_by uuid NOT NULL
        REFERENCES public.users(id),
    assigned_to uuid
        REFERENCES public.users(id),
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL DEFAULT 'general',
    priority text NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'on_hold', 'resolved', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tickets_organization_reporter_idx
    ON public.tickets (organization_id, reported_by);

CREATE INDEX tickets_organization_status_idx
    ON public.tickets (organization_id, status);

CREATE INDEX tickets_assigned_idx
    ON public.tickets (assigned_to);

-- =====================================================
-- 5. TICKET COMMENTS
-- =====================================================

CREATE TABLE public.ticket_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL
        REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE RESTRICT,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_comments_ticket_created_idx
    ON public.ticket_comments (ticket_id, created_at);

-- =====================================================
-- 6. SUBSCRIPTIONS
-- =====================================================

CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL UNIQUE
        REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan text NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'pro')),
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'past_due', 'canceled')),
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamptz,
    current_period_end timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. PAYMENTS
-- =====================================================

CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id) ON DELETE RESTRICT,
    stripe_event_id text NOT NULL UNIQUE,
    amount integer NOT NULL CHECK (amount >= 0),
    status text NOT NULL
        CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_organization_created_idx
    ON public.payments (organization_id, created_at);

-- =====================================================
-- 8. CHAT USAGE DAILY
-- =====================================================

CREATE TABLE public.chat_usage_daily (
    user_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id) ON DELETE CASCADE,
    day date NOT NULL DEFAULT CURRENT_DATE,
    messages_count integer NOT NULL DEFAULT 0
        CHECK (messages_count >= 0),
    PRIMARY KEY (user_id, organization_id, day)
);

CREATE INDEX chat_usage_organization_day_idx
    ON public.chat_usage_daily (organization_id, day);

-- =====================================================
-- 9. AUTOMATIC UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage_daily ENABLE ROW LEVEL SECURITY;
