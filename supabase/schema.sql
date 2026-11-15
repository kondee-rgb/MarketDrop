-- MarketDrop cloud sync. Paste into Supabase → SQL Editor → Run (once).
-- Only the app's server (service role key) can read or write: RLS is on and no policies are granted.

create table if not exists public.app_kv (
  key text primary key,          -- e.g. marketdrop_price_book_v1
  value text not null,           -- the same JSON text the phone keeps
  updated_at timestamptz not null
);

create table if not exists public.app_orders (
  id text primary key,           -- order id
  data jsonb,                    -- the order (null when deleted)
  deleted boolean not null default false,
  updated_at timestamptz not null
);

create index if not exists app_kv_updated_idx on public.app_kv (updated_at);
create index if not exists app_orders_updated_idx on public.app_orders (updated_at);

alter table public.app_kv enable row level security;
alter table public.app_orders enable row level security;
