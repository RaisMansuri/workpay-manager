-- ==========================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Execute this SQL in your Supabase Project -> SQL Editor
-- ==========================================================================

-- 1. Create customer_records Table
CREATE TABLE IF NOT EXISTS public.customer_records (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  address TEXT,
  service_type VARCHAR(255) NOT NULL,
  work_description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Indexes for High-Performance Searching & Filtering
CREATE INDEX IF NOT EXISTS idx_customer_name ON public.customer_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_mobile_number ON public.customer_records(mobile_number);
CREATE INDEX IF NOT EXISTS idx_status ON public.customer_records(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON public.customer_records(created_at);

-- 3. Enable Row Level Security (RLS) - Allow public access for Phase 1 / MVP
ALTER TABLE public.customer_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
  ON public.customer_records 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access" 
  ON public.customer_records 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access" 
  ON public.customer_records 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete access" 
  ON public.customer_records 
  FOR DELETE 
  USING (true);

-- 4. Enable Supabase Realtime for Multi-User Sync Across Tabs & Devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_records;
