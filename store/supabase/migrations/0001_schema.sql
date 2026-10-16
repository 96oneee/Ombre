-- =====================================================================
-- OMBRE store: schema
-- Run once on a fresh Supabase project (SQL Editor), in file order.
-- =====================================================================

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create type public.product_status as enum ('active', 'draft', 'archived');
create type public.discount_type  as enum ('percentage', 'fixed');

-- ---------------------------------------------------------------- admins
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ catalogue
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories(id) on delete set null,
  name              text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text,
  description       text,
  price             numeric(10,2) not null default 0 check (price >= 0),
  sale_price        numeric(10,2) check (sale_price is null or (sale_price >= 0 and sale_price <= price)),
  sku               text unique,
  status            public.product_status not null default 'draft',
  specs             jsonb not null default '[]'::jsonb,   -- [{ "label": "...", "value": "..." }]
  seo_title         text,
  seo_description   text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_status_sort_idx on public.products (status, sort_order);
create index products_category_idx    on public.products (category_id);

-- A "variant" is a purchasable colour/option of a product.
create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name       text not null,
  hex_color  text check (hex_color is null or hex_color ~* '^#[0-9a-f]{6}$'),
  sku        text unique,
  price      numeric(10,2) check (price is null or price >= 0),          -- overrides product price
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name),
  check (price is null or sale_price is null or sale_price <= price)
);
create index variants_product_idx on public.product_variants (product_id, sort_order);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete cascade,  -- null = shared by all colours
  storage_path text not null,                                                   -- path inside bucket "product-images"
  alt_text     text,
  sort_order   int not null default 0,
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index product_images_scope_idx on public.product_images (product_id, variant_id, sort_order);
-- at most one featured image per product/colour scope
create unique index product_images_one_featured_idx on public.product_images
  (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_featured;

-- -------------------------------------------------------------- inventory
create table public.inventory (
  variant_id          uuid primary key references public.product_variants(id) on delete cascade,
  quantity            int not null default 0 check (quantity >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  updated_at          timestamptz not null default now()
);

create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references public.product_variants(id) on delete cascade,
  change         int not null,
  quantity_after int not null,
  reason         text not null check (reason in ('order','cancel_restock','reopen','manual','initial')),
  order_id       uuid,
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);

-- -------------------------------------------------------- order settings
create table public.order_statuses (
  key                text primary key check (key ~ '^[a-z0-9_]+$'),
  label              text not null,
  color              text not null default '#6b7280',
  sort_order         int  not null default 0,
  is_default         boolean not null default false,
  restocks_inventory boolean not null default false   -- e.g. Cancelled puts items back in stock
);
create unique index order_statuses_one_default_idx on public.order_statuses (is_default) where is_default;

create table public.payment_methods (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  label       text not null,
  description text,
  provider    text not null default 'manual',   -- maps to a provider in src/lib/payments
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

create table public.delivery_settings (
  id                      smallint primary key default 1 check (id = 1),  -- single row
  is_enabled              boolean not null default true,
  flat_fee                numeric(10,2) not null default 0 check (flat_fee >= 0),
  free_delivery_threshold numeric(10,2) check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  notes                   text,
  updated_at              timestamptz not null default now()
);

create table public.delivery_regions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  fee_override numeric(10,2) check (fee_override is null or fee_override >= 0),  -- null = use flat fee
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

-- --------------------------------------------------------------- customers
create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  phone            text not null unique,   -- normalised, e.g. +96171123456
  email            text,
  last_governorate text,
  last_city        text,
  last_address     text,
  notes            text,
  user_id          uuid unique references auth.users(id) on delete set null,  -- for future customer accounts
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- discounts
create table public.discounts (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  description text,
  type        public.discount_type not null,
  value       numeric(10,2) not null check (value > 0),
  min_order   numeric(10,2) not null default 0 check (min_order >= 0),
  starts_at   timestamptz,
  ends_at     timestamptz,
  max_uses    int check (max_uses is null or max_uses > 0),
  used_count  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index discounts_code_upper_idx on public.discounts (upper(code));

-- ------------------------------------------------------------------ orders
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique,
  customer_id     uuid references public.customers(id) on delete set null,
  status          text not null references public.order_statuses(key) on update cascade,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  governorate     text not null,
  city            text not null,
  address         text not null,
  notes           text,
  subtotal        numeric(10,2) not null check (subtotal >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  delivery_fee    numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total           numeric(10,2) not null check (total >= 0),
  currency        text not null default 'USD',
  discount_id     uuid references public.discounts(id) on delete set null,
  discount_code   text,
  payment_method  text not null references public.payment_methods(key) on update cascade,
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_created_idx  on public.orders (created_at desc);
create index orders_status_idx   on public.orders (status);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  position     smallint not null default 0,
  product_id   uuid references public.products(id) on delete set null,
  variant_id   uuid references public.product_variants(id) on delete set null,
  product_name text not null,    -- copied at purchase time
  variant_name text,
  sku          text,
  image_path   text,
  unit_price   numeric(10,2) not null check (unit_price >= 0),
  quantity     int not null check (quantity > 0),
  line_total   numeric(10,2) not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id, position);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.discount_redemptions (
  id          uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount      numeric(10,2) not null,
  created_at  timestamptz not null default now()
);
create index discount_redemptions_discount_idx on public.discount_redemptions (discount_id);

-- ----------------------------------------------------------------- website
create table public.site_settings (
  key        text primary key,
  value      jsonb not null default '""'::jsonb,
  label      text,
  group_name text not null default 'general',
  updated_at timestamptz not null default now()
);

create table public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  is_published     boolean not null default true,
  seo_title        text,
  seo_description  text,
  updated_at       timestamptz not null default now()
);

create table public.page_sections (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.pages(id) on delete cascade,
  type       text not null check (type in ('hero','text','image','image_text','featured_product','cta','gallery')),
  content    jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index page_sections_page_idx on public.page_sections (page_id, sort_order);

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null default 'site-media',
  path        text not null,
  filename    text,
  alt_text    text,
  mime_type   text,
  size_bytes  bigint,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

-- ------------------------------------------------------ updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','product_variants','inventory','customers','discounts',
    'orders','delivery_settings','site_settings','pages','page_sections'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Every new colour/variant automatically gets an inventory row.
create or replace function public.create_inventory_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (variant_id, quantity) values (new.id, 0)
  on conflict (variant_id) do nothing;
  return new;
end $$;

create trigger variant_inventory_row after insert on public.product_variants
for each row execute function public.create_inventory_row();
