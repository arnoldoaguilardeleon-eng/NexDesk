
-- =========================================================
-- NexDesk - Migration 001
-- Create missing database tables
-- =========================================================

BEGIN;

-- 1. TICKET COMMENTS
CREATE TABLE public.ticket_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL
        REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id uuid NOT NULL
        REFERENCES public.users(id) ON DELETE RESTRICT,
    body text NOT NULL CHECK (length(trim(body)) > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_comments_ticket_created_idx
ON public.ticket_comments (ticket_id, created_at);


-- 2. SUBSCRIPTIONS
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
-- Crear suscripción Free para organizaciones existentes
INSERT INTO public.subscriptions (organization_id, plan, status)
SELECT id, 'free', 'active'
FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- 3. PAYMENTS
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


-- 4. CHAT USAGE DAILY
CREATE TABLE public.chat_usage_daily (
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    day date NOT NULL DEFAULT CURRENT_DATE,
    messages_count integer NOT NULL DEFAULT 0
        CHECK (messages_count >= 0),

    PRIMARY KEY (user_id, organization_id, day),

    CONSTRAINT chat_usage_membership_fk
        FOREIGN KEY (organization_id, user_id)
        REFERENCES public.organization_members (organization_id, user_id)
        ON DELETE CASCADE
);

CREATE INDEX chat_usage_organization_day_idx
ON public.chat_usage_daily (organization_id, day);


-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage_daily ENABLE ROW LEVEL SECURITY;


-- 6. UPDATED_AT TRIGGER FUNCTION
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

COMMIT;
