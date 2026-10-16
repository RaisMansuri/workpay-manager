-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - SUBSCRIPTION & ENTITLEMENTS SCHEMA
-- Project: nqnyhqkwskvkstpqjvkv
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/sql/new
-- ============================================================================

-- 1. Ensure `profiles` table has avatar_url and preferences columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"sms_alerts": true, "default_page_size": 10, "compact_view": false, "audio_chimes": true}'::jsonb;

-- 2. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Pro Plan',
  plan_tier TEXT NOT NULL DEFAULT 'pro', -- 'starter', 'pro', 'enterprise'
  billing_cycle TEXT NOT NULL DEFAULT 'yearly', -- 'monthly', 'yearly'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'trialing', 'past_due', 'expired'
  amount NUMERIC(10, 2) NOT NULL DEFAULT 4999,
  currency TEXT NOT NULL DEFAULT 'INR',
  max_staff_limit INT NOT NULL DEFAULT 10,
  features JSONB DEFAULT '{"sms_notifications": true, "csv_export": true, "advanced_analytics": true, "priority_support": true, "custom_branding": true}'::jsonb,
  promo_code TEXT,
  discount_applied NUMERIC(10, 2) DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 3. Create Performance Indexes for Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_tier ON public.subscriptions(plan_tier);

-- 4. Enable Row Level Security on Subscriptions Table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
DROP POLICY IF EXISTS "Allow authenticated read subscriptions" ON public.subscriptions;
CREATE POLICY "Allow authenticated read subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins and owners to manage subscriptions" ON public.subscriptions;
CREATE POLICY "Allow admins and owners to manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (
    auth.uid() = user_id OR public.is_admin() OR auth.role() = 'service_role'
  );

-- 6. Server-Side Enforcement: Trigger Function to Check Staff Limits on Profiles
CREATE OR REPLACE FUNCTION public.check_staff_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_sub RECORD;
  current_staff_count INT;
  allowed_limit INT := 10; -- Default fallback limit
BEGIN
  -- Only enforce when inserting or updating a profile with role = 'staff'
  IF NEW.role = 'staff' THEN
    -- Look up the active organization subscription (from admin or primary active sub)
    SELECT * INTO active_sub 
    FROM public.subscriptions 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1;

    IF FOUND THEN
      allowed_limit := COALESCE(active_sub.max_staff_limit, 10);
    END IF;

    -- Count active staff members excluding this new record
    SELECT COUNT(*) INTO current_staff_count 
    FROM public.profiles 
    WHERE role = 'staff' 
      AND (TG_OP = 'INSERT' OR id != NEW.id);

    -- Enforce the maximum staff limit
    IF current_staff_count >= allowed_limit THEN
      RAISE EXCEPTION 'Staff limit reached for your current subscription plan (%)! Current: %, Limit: %. Please upgrade your subscription to add more staff members.', 
        COALESCE(active_sub.plan_name, 'Current Plan'), 
        current_staff_count, 
        allowed_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_staff_limit ON public.profiles;
CREATE TRIGGER trigger_enforce_staff_limit
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_staff_limit();

-- 7. Seed Initial Active Pro Plan for Existing Admin User
INSERT INTO public.subscriptions (
  user_id,
  plan_name,
  plan_tier,
  billing_cycle,
  status,
  amount,
  max_staff_limit,
  features,
  current_period_start,
  current_period_end
)
SELECT 
  p.id,
  'Pro Plan',
  'pro',
  'yearly',
  'active',
  14999.00,
  10,
  '{"sms_notifications": true, "csv_export": true, "advanced_analytics": true, "priority_support": true, "custom_branding": true}'::jsonb,
  NOW(),
  NOW() + INTERVAL '1 year'
FROM public.profiles p
WHERE p.role = 'admin'
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 8. Add Subscriptions to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
