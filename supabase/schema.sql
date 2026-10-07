-- ==============================================================================
-- Priya Dream Kitchen - Supabase Database Schema
-- Run this entire script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Table: invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  invoice_date date not null default current_date,
  customer_name text not null,
  country text,
  phone text,
  guests int default 1 check (guests >= 1),
  booking_date date,
  booking_time time,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  discount_type text default 'fixed' check (discount_type in ('fixed', 'percentage')),
  total numeric(10, 2) not null default 0,
  payment_method text default 'cash',
  payment_status text default 'Pending',
  notes text,
  created_at timestamptz not null default now()
);

-- Index for quick sorting and filtering
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);
create index if not exists idx_invoices_invoice_no on public.invoices(invoice_no);

-- 2. Table: settings (single row configuration)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  business_whatsapp text default '+94 77 000 0000',
  preset_items jsonb not null default '[
    {"id": "rice-7-curries", "label": "Rice + 7 Curries", "description": "Sri Lankan Rice & 7 Curries Cooking Class", "price": 35},
    {"id": "chicken-kottu", "label": "Chicken Kottu Class", "description": "Chicken Kottu Roti Cooking Class", "price": 30},
    {"id": "extra-guest", "label": "Extra Guest", "description": "Additional Guest Fee", "price": 15}
  ]'::jsonb,
  currency_symbol text default '$',
  invoice_prefix text default 'PDK',
  next_invoice_number int not null default 1 check (next_invoice_number >= 1)
);

-- Seed initial settings row if not present
insert into public.settings (id, business_whatsapp, currency_symbol, invoice_prefix, next_invoice_number)
values (1, '+94 77 000 0000', '$', 'PDK', 1)
on conflict (id) do nothing;

-- 3. Atomic Postgres Function: next_invoice_no()
-- Atomically increments next_invoice_number using row-level locking
-- and returns formatted invoice number e.g. "PDK-0001"
create or replace function public.next_invoice_no()
returns text
language plpgsql
security definer
as $$
declare
  v_prefix text;
  v_num int;
  v_result text;
begin
  -- Lock settings row and atomically increment
  update public.settings
  set next_invoice_number = next_invoice_number + 1
  where id = 1
  returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_num;

  -- Fallback if settings row was missing
  if not found then
    insert into public.settings (id, invoice_prefix, next_invoice_number)
    values (1, 'PDK', 2)
    returning invoice_prefix, 1 into v_prefix, v_num;
  end if;

  v_result := coalesce(v_prefix, 'PDK') || '-' || lpad(v_num::text, 4, '0');
  return v_result;
end;
$$;

-- Grant execution to authenticated & anon roles
grant execute on function public.next_invoice_no() to authenticated, anon;

-- 4. Row Level Security (RLS)
alter table public.invoices enable row level security;
alter table public.settings enable row level security;

-- Policies for invoices (Authenticated users only)
create policy "Authenticated users can select invoices"
  on public.invoices for select
  to authenticated
  using (true);

create policy "Authenticated users can insert invoices"
  on public.invoices for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update invoices"
  on public.invoices for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete invoices"
  on public.invoices for delete
  to authenticated
  using (true);

-- Policies for settings (Authenticated users only)
create policy "Authenticated users can select settings"
  on public.settings for select
  to authenticated
  using (true);

create policy "Authenticated users can insert settings"
  on public.settings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update settings"
  on public.settings for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete settings"
  on public.settings for delete
  to authenticated
  using (true);

-- NOTE FOR DEVELOPMENT / DEMO (OPTIONAL):
-- If you are testing the app in the browser before setting up Supabase Auth logins,
-- you can temporarily allow anon access by running the optional policies below:
--
-- create policy "Anon can select invoices" on public.invoices for select to anon using (true);
-- create policy "Anon can insert invoices" on public.invoices for insert to anon with check (true);
-- create policy "Anon can update invoices" on public.invoices for update to anon using (true) with check (true);
-- create policy "Anon can select settings" on public.settings for select to anon using (true);
