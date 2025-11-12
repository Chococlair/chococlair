-- Create table to store per-day product availability
create table public.daily_product_availability (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products (id) on delete cascade,
  available_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, available_date)
);

alter table public.daily_product_availability enable row level security;

create policy "Public read daily availability"
  on public.daily_product_availability
  for select
  using (true);

create policy "Admins manage daily availability"
  on public.daily_product_availability
  for all
  using (is_admin())
  with check (is_admin());


-- Create promotions table
create type public.promotion_discount_type as enum ('percentage', 'fixed', 'free_shipping');

create table public.promotions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  discount_type public.promotion_discount_type not null default 'percentage',
  discount_value numeric(10,2),
  applies_to_all boolean not null default false,
  free_shipping boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "Public read active promotions"
  on public.promotions
  for select
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Admins read all promotions"
  on public.promotions
  for select
  using (is_admin());

create policy "Admins manage promotions"
  on public.promotions
  for all
  using (is_admin())
  with check (is_admin());


-- Link promotions to specific products
create table public.promotion_products (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (promotion_id, product_id)
);

create trigger update_promotions_updated_at
  before update on public.promotions
  for each row
  execute function public.update_updated_at_column();


-- Extend orders and order_items to store discounts/promotions metadata
alter table public.orders
  add column if not exists discount_total numeric(10,2) not null default 0,
  add column if not exists applied_promotions jsonb;

alter table public.order_items
  add column if not exists discount_amount numeric(10,2) not null default 0;

alter table public.promotion_products enable row level security;

create policy "Public read promotion products"
  on public.promotion_products
  for select
  using (true);

create policy "Admins manage promotion products"
  on public.promotion_products
  for all
  using (is_admin())
  with check (is_admin());

