-- Supabase Dashboard > SQL Editor-এ পুরো ফাইলটি চালান।
create table if not exists public.localpay_payments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null default '',
  amount numeric(12,2) not null check (amount > 0),
  method text not null,
  transaction_ref text not null default '',
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  note text not null default '',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

-- Browser clients must not access this table directly.
alter table public.localpay_payments enable row level security;
revoke all on public.localpay_payments from anon, authenticated;
-- All reads/writes go through server.js, which checks the admin's verified Supabase session.
