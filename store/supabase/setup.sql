-- OMBRE store: complete database setup. Paste this whole file into Supabase > SQL Editor and press Run, once, on a new project.
-- It is the files in supabase/migrations (0001 to 0005) followed by supabase/seed_ombre.sql.

-- ===== supabase/migrations/0001_schema.sql =====
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

-- ===== supabase/migrations/0002_functions.sql =====
-- =====================================================================
-- OMBRE store: functions (security, ordering, admin operations)
-- =====================================================================

-- Is the current logged-in user listed in public.admins?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Normalise a phone number to +<digits>. Numbers without a country code are treated as Lebanese.
create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then return null; end if;
  if left(btrim(p), 1) = '+' then return '+' || d; end if;
  if left(d, 2) = '00' then return '+' || substr(d, 3); end if;
  d := regexp_replace(d, '^0+', '');
  if left(d, 3) = '961' and length(d) > 8 then return '+' || d; end if;
  return '+961' || d;
end $$;

-- Random, hard-to-guess order number such as OM-7K3QX9PD.
-- (Order pages are public by number, so numbers must not be sequential.)
create or replace function public.gen_order_number() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea;
  n text;
  result text;
  i int;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    n := '';
    for i in 0..7 loop
      n := n || substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1);
    end loop;
    result := 'OM-' || n;
    exit when not exists (select 1 from public.orders where order_number = result);
  end loop;
  return result;
end $$;

-- =====================================================================
-- place_order: the ONLY way a customer creates an order.
-- Prices, stock, delivery and discounts are all decided here, on the server.
-- Everything runs in one transaction: any error rolls the whole order back.
--
--   p_customer: { full_name, phone, email?, city, address, notes? }
--   p_items:    [ { variant_id, quantity }, ... ]
--   p_region_id: delivery_regions.id
-- Returns the new order number.
-- =====================================================================
create or replace function public.place_order(
  p_customer       jsonb,
  p_items          jsonb,
  p_region_id      uuid,
  p_payment_method text default 'cod',
  p_discount_code  text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_name     text := btrim(coalesce(p_customer->>'full_name', ''));
  v_phone    text := public.normalize_phone(p_customer->>'phone');
  v_email    text := nullif(btrim(coalesce(p_customer->>'email', '')), '');
  v_city     text := btrim(coalesce(p_customer->>'city', ''));
  v_address  text := btrim(coalesce(p_customer->>'address', ''));
  v_notes    text := nullif(btrim(coalesce(p_customer->>'notes', '')), '');

  v_elem     jsonb;
  v_item     record;
  v_row      record;
  v_line     record;
  v_stock    int;
  v_unit     numeric(10,2);
  v_qty_left int;
  v_subtotal numeric(10,2) := 0;
  v_lines    jsonb := '[]'::jsonb;
  v_pos      smallint := 0;

  v_settings public.delivery_settings;
  v_region   public.delivery_regions;
  v_pm       public.payment_methods;
  v_discount public.discounts;
  v_discount_amount numeric(10,2) := 0;
  v_fee      numeric(10,2) := 0;
  v_total    numeric(10,2);
  v_currency text;
  v_status   text;
  v_customer_id uuid;
  v_order_id uuid;
  v_number   text;
begin
  ---------------------------------------------------------------- validate input
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Please enter your full name.';
  end if;
  if v_phone is null or v_phone !~ '^\+[0-9]{8,15}$'
     or (left(v_phone, 4) = '+961' and length(v_phone) not between 11 and 12) then
    raise exception 'Please enter a valid phone number.';
  end if;
  if v_email is not null and (length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Please enter a valid email address.';
  end if;
  if length(v_city) < 2 or length(v_city) > 120 then
    raise exception 'Please enter your city or area.';
  end if;
  if length(v_address) < 5 or length(v_address) > 300 then
    raise exception 'Please enter your street, building and floor.';
  end if;
  if v_notes is not null and length(v_notes) > 500 then
    raise exception 'Delivery notes are too long.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Your cart is empty.';
  end if;
  for v_elem in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_elem) <> 'object'
       or coalesce(v_elem->>'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_elem->>'quantity', '') !~ '^[0-9]{1,3}$'
       or (v_elem->>'quantity')::int < 1 then
      raise exception 'Your cart contains an invalid item.';
    end if;
  end loop;

  ---------------------------------------------------------- settings lookups
  select * into v_settings from public.delivery_settings where id = 1;
  if not found or not v_settings.is_enabled then
    raise exception 'Delivery is currently unavailable.';
  end if;

  select * into v_region from public.delivery_regions where id = p_region_id and is_active;
  if not found then
    raise exception 'Please choose a delivery region.';
  end if;

  select * into v_pm from public.payment_methods
   where key = coalesce(p_payment_method, 'cod') and is_active;
  if not found then
    raise exception 'This payment method is not available.';
  end if;

  select coalesce(value #>> '{}', 'USD') into v_currency from public.site_settings where key = 'currency_code';
  v_currency := coalesce(v_currency, 'USD');

  ------------------------------------- check products, prices and stock (locked)
  -- Rows are processed in variant-id order so concurrent orders cannot deadlock.
  for v_item in
    select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::int)::int as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    select v.id as variant_id, v.name as variant_name, v.sku, v.is_active as variant_active,
           p.id as product_id, p.name as product_name, p.status as product_status,
           coalesce(v.price, p.price) as list_price,
           coalesce(v.sale_price, case when v.price is null then p.sale_price end) as sale_price,
           (select pi.storage_path from public.product_images pi
             where pi.product_id = p.id and (pi.variant_id = v.id or pi.variant_id is null)
             order by (pi.variant_id is not null) desc, pi.is_featured desc, pi.sort_order, pi.created_at
             limit 1) as image_path
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_item.variant_id;

    if not found or not v_row.variant_active or v_row.product_status <> 'active' then
      raise exception 'One of the items in your cart is no longer available.';
    end if;

    -- lock the stock row for the rest of this transaction
    select quantity into v_stock from public.inventory where variant_id = v_item.variant_id for update;
    if not found or v_stock < v_item.qty then
      if coalesce(v_stock, 0) <= 0 then
        raise exception '% (%) is out of stock.', v_row.product_name, v_row.variant_name;
      else
        raise exception 'Only % left of % (%).', v_stock, v_row.product_name, v_row.variant_name;
      end if;
    end if;

    v_unit := case when v_row.sale_price is not null and v_row.sale_price < v_row.list_price
                   then v_row.sale_price else v_row.list_price end;
    v_subtotal := v_subtotal + v_unit * v_item.qty;

    v_lines := v_lines || jsonb_build_object(
      'variant_id', v_row.variant_id, 'product_id', v_row.product_id,
      'product_name', v_row.product_name, 'variant_name', v_row.variant_name,
      'sku', v_row.sku, 'image_path', v_row.image_path,
      'unit_price', v_unit, 'quantity', v_item.qty);
  end loop;

  ------------------------------------------------------------------- discount
  if p_discount_code is not null and btrim(p_discount_code) <> '' then
    select * into v_discount from public.discounts
     where upper(code) = upper(btrim(p_discount_code)) for update;
    if not found
       or not v_discount.is_active
       or (v_discount.starts_at is not null and v_discount.starts_at > now())
       or (v_discount.ends_at   is not null and v_discount.ends_at   < now())
       or v_subtotal < v_discount.min_order
       or (v_discount.max_uses is not null and v_discount.used_count >= v_discount.max_uses) then
      raise exception 'This discount code is not valid.';
    end if;
    v_discount_amount := case v_discount.type
      when 'percentage' then round(v_subtotal * v_discount.value / 100, 2)
      else least(v_discount.value, v_subtotal) end;
  end if;

  --------------------------------------------------------------- delivery fee
  v_fee := coalesce(v_region.fee_override, v_settings.flat_fee);
  if v_settings.free_delivery_threshold is not null
     and (v_subtotal - v_discount_amount) >= v_settings.free_delivery_threshold then
    v_fee := 0;
  end if;

  v_total := v_subtotal - v_discount_amount + v_fee;

  ------------------------------------------------------------ customer + order
  insert into public.customers (full_name, phone, email, last_governorate, last_city, last_address)
  values (v_name, v_phone, v_email, v_region.name, v_city, v_address)
  on conflict (phone) do update
    set full_name        = excluded.full_name,
        email            = coalesce(excluded.email, public.customers.email),
        last_governorate = excluded.last_governorate,
        last_city        = excluded.last_city,
        last_address     = excluded.last_address
  returning id into v_customer_id;

  select key into v_status from public.order_statuses where is_default limit 1;
  v_status := coalesce(v_status, 'pending');
  v_number := public.gen_order_number();

  insert into public.orders (
    order_number, customer_id, status, customer_name, customer_phone, customer_email,
    governorate, city, address, notes, subtotal, discount_amount, delivery_fee, total,
    currency, discount_id, discount_code, payment_method, payment_status)
  values (
    v_number, v_customer_id, v_status, v_name, v_phone, v_email,
    v_region.name, v_city, v_address, v_notes, v_subtotal, v_discount_amount, v_fee, v_total,
    v_currency, v_discount.id, v_discount.code, v_pm.key, 'unpaid')
  returning id into v_order_id;

  ------------------------------------------------ items, stock, movements, history
  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_pos := v_pos + 1;

    insert into public.order_items (
      order_id, position, product_id, variant_id, product_name, variant_name, sku, image_path,
      unit_price, quantity, line_total)
    values (
      v_order_id, v_pos,
      (v_line.value->>'product_id')::uuid, (v_line.value->>'variant_id')::uuid,
      v_line.value->>'product_name', v_line.value->>'variant_name',
      v_line.value->>'sku', v_line.value->>'image_path',
      (v_line.value->>'unit_price')::numeric, (v_line.value->>'quantity')::int,
      (v_line.value->>'unit_price')::numeric * (v_line.value->>'quantity')::int);

    update public.inventory
       set quantity = quantity - (v_line.value->>'quantity')::int
     where variant_id = (v_line.value->>'variant_id')::uuid
    returning quantity into v_qty_left;

    insert into public.inventory_movements (variant_id, change, quantity_after, reason, order_id, note)
    values ((v_line.value->>'variant_id')::uuid, -(v_line.value->>'quantity')::int,
            v_qty_left, 'order', v_order_id, v_number);
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order_id, null, v_status, 'Order placed');

  if v_discount.id is not null then
    insert into public.discount_redemptions (discount_id, order_id, customer_id, amount)
    values (v_discount.id, v_order_id, v_customer_id, v_discount_amount);
    update public.discounts set used_count = used_count + 1 where id = v_discount.id;
  end if;

  return v_number;
end $$;

-- Check a discount code for the checkout preview (place_order re-checks everything).
create or replace function public.validate_discount(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d public.discounts; amt numeric(10,2);
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'message', 'Enter a discount code.');
  end if;
  select * into d from public.discounts where upper(code) = upper(btrim(p_code));
  if not found or not d.is_active
     or (d.starts_at is not null and d.starts_at > now())
     or (d.ends_at   is not null and d.ends_at   < now())
     or (d.max_uses is not null and d.used_count >= d.max_uses) then
    return jsonb_build_object('valid', false, 'message', 'This discount code is not valid.');
  end if;
  if coalesce(p_subtotal, 0) < d.min_order then
    return jsonb_build_object('valid', false, 'message', 'This code needs a higher order total.', 'min_order', d.min_order);
  end if;
  amt := case d.type when 'percentage' then round(p_subtotal * d.value / 100, 2)
                     else least(d.value, p_subtotal) end;
  return jsonb_build_object('valid', true, 'amount', amt, 'code', d.code, 'message', 'Discount applied.');
end $$;

-- Public order confirmation data. The order number is the secret, and phone/email are not returned.
create or replace function public.get_order_public(p_number text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'status', o.status,
    'status_label', s.label,
    'payment_method', pm.label,
    'governorate', o.governorate,
    'city', o.city,
    'address', o.address,
    'subtotal', o.subtotal,
    'discount_amount', o.discount_amount,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'currency', o.currency,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'variant_name', i.variant_name,
        'unit_price', i.unit_price, 'quantity', i.quantity,
        'line_total', i.line_total, 'image_path', i.image_path) order by i.position)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.orders o
  join public.order_statuses s on s.key = o.status
  join public.payment_methods pm on pm.key = o.payment_method
  where o.order_number = upper(btrim(p_number));
$$;

-- =====================================================================
-- Admin operations (each one checks is_admin() itself)
-- =====================================================================

-- Change an order's status; logs history and puts stock back when an order is cancelled
-- (and takes it out again if a cancelled order is re-opened).
create or replace function public.admin_update_order_status(
  p_order_id uuid, p_status text, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old text; v_new public.order_statuses; v_old_row public.order_statuses;
  v_item record; v_qty int;
begin
  if not public.is_admin() then raise exception 'Not authorized.' using errcode = '42501'; end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;

  select * into v_new from public.order_statuses where key = p_status;
  if not found then raise exception 'Unknown order status.'; end if;
  if v_old = p_status then return; end if;

  select * into v_old_row from public.order_statuses where key = v_old;

  if v_new.restocks_inventory and not coalesce(v_old_row.restocks_inventory, false) then
    for v_item in select variant_id, quantity from public.order_items
                   where order_id = p_order_id and variant_id is not null order by variant_id loop
      update public.inventory set quantity = quantity + v_item.quantity
       where variant_id = v_item.variant_id returning quantity into v_qty;
      if found then
        insert into public.inventory_movements (variant_id, change, quantity_after, reason, order_id, created_by)
        values (v_item.variant_id, v_item.quantity, v_qty, 'cancel_restock', p_order_id, auth.uid());
      end if;
    end loop;
  elsif not v_new.restocks_inventory and coalesce(v_old_row.restocks_inventory, false) then
    for v_item in select variant_id, quantity from public.order_items
                   where order_id = p_order_id and variant_id is not null order by variant_id loop
      update public.inventory set quantity = quantity - v_item.quantity
       where variant_id = v_item.variant_id and quantity >= v_item.quantity
      returning quantity into v_qty;
      if not found then raise exception 'Not enough stock to re-open this order.'; end if;
      insert into public.inventory_movements (variant_id, change, quantity_after, reason, order_id, created_by)
      values (v_item.variant_id, -v_item.quantity, v_qty, 'reopen', p_order_id, auth.uid());
    end loop;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, v_old, p_status, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''));
end $$;

-- Set stock for a colour and record the movement.
create or replace function public.admin_adjust_inventory(
  p_variant_id uuid, p_quantity int, p_note text default null, p_low_threshold int default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old int; v_reason text;
begin
  if not public.is_admin() then raise exception 'Not authorized.' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'Stock cannot be negative.'; end if;

  select quantity into v_old from public.inventory where variant_id = p_variant_id for update;
  if not found then
    insert into public.inventory (variant_id, quantity) values (p_variant_id, 0);
    v_old := 0;
  end if;

  update public.inventory
     set quantity = p_quantity,
         low_stock_threshold = coalesce(p_low_threshold, low_stock_threshold)
   where variant_id = p_variant_id;

  if p_quantity <> v_old then
    v_reason := case when v_old = 0 and not exists (
                  select 1 from public.inventory_movements where variant_id = p_variant_id)
                then 'initial' else 'manual' end;
    insert into public.inventory_movements (variant_id, change, quantity_after, reason, note, created_by)
    values (p_variant_id, p_quantity - v_old, p_quantity, v_reason,
            nullif(btrim(coalesce(p_note, '')), ''), auth.uid());
  end if;
end $$;

-- Numbers for the admin dashboard.
create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_default text;
begin
  if not public.is_admin() then raise exception 'Not authorized.' using errcode = '42501'; end if;
  select key into v_default from public.order_statuses where is_default limit 1;
  return jsonb_build_object(
    'total_orders', (select count(*) from public.orders),
    'sales', coalesce((select sum(o.total) from public.orders o
                        join public.order_statuses s on s.key = o.status
                       where not s.restocks_inventory), 0),
    'pending_orders', (select count(*) from public.orders where status = v_default),
    'products', (select count(*) from public.products where status <> 'archived'),
    'low_stock', (select count(*) from public.inventory i
                   join public.product_variants v on v.id = i.variant_id
                  where v.is_active and i.quantity <= i.low_stock_threshold)
  );
end $$;

-- Customer totals for the admin Customers screen (respects RLS of the caller).
create view public.customer_stats with (security_invoker = true) as
select c.id as customer_id,
       count(o.id)                                                      as total_orders,
       coalesce(sum(o.total) filter (where not coalesce(s.restocks_inventory, false)), 0) as total_spent,
       max(o.created_at)                                                as last_order_at
  from public.customers c
  left join public.orders o on o.customer_id = c.id
  left join public.order_statuses s on s.key = o.status
 group by c.id;

-- ----------------------------------------------------- function permissions
revoke execute on all functions in schema public from public;

grant execute on function public.place_order(jsonb, jsonb, uuid, text, text) to anon, authenticated;
grant execute on function public.validate_discount(text, numeric)            to anon, authenticated;
grant execute on function public.get_order_public(text)                      to anon, authenticated;
grant execute on function public.is_admin()                                  to anon, authenticated;

revoke execute on function public.admin_update_order_status(uuid, text, text)        from anon;
revoke execute on function public.admin_adjust_inventory(uuid, int, text, int)       from anon;
revoke execute on function public.admin_dashboard_stats()                            from anon;
grant  execute on function public.admin_update_order_status(uuid, text, text)        to authenticated;
grant  execute on function public.admin_adjust_inventory(uuid, int, text, int)       to authenticated;
grant  execute on function public.admin_dashboard_stats()                            to authenticated;

-- Internal helpers are not callable from the browser.
revoke execute on function public.gen_order_number()     from anon, authenticated;
revoke execute on function public.create_inventory_row() from anon, authenticated;
revoke execute on function public.set_updated_at()       from anon, authenticated;

-- ===== supabase/migrations/0003_rls.sql =====
-- =====================================================================
-- OMBRE store: Row Level Security
--   * The public (anon) can only READ published / active content.
--   * Nobody can write through the public API. Orders go through place_order().
--   * Admins (rows in public.admins) can manage everything.
-- =====================================================================

-- 1) Turn RLS on everywhere and give admins full access.
do $$
declare t text;
begin
  foreach t in array array[
    'admins','categories','products','product_variants','product_images',
    'inventory','inventory_movements','order_statuses','payment_methods',
    'delivery_settings','delivery_regions','customers','discounts','orders',
    'order_items','order_status_history','discount_redemptions',
    'site_settings','pages','page_sections','media'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if t <> 'admins' then
      execute format(
        'create policy "admins manage %1$s" on public.%1$I
           for all to authenticated
           using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- Admins table: admins may read it; nobody can change it from the API.
-- (Add the first admin from the SQL editor, see README.)
create policy "admins read admins" on public.admins
  for select to authenticated using (public.is_admin());

-- 2) Public read access (only what the storefront needs).
create policy "public read active categories" on public.categories
  for select to anon, authenticated using (is_active);

create policy "public read active products" on public.products
  for select to anon, authenticated using (status = 'active');

create policy "public read active variants" on public.product_variants
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.products p
       where p.id = product_variants.product_id and p.status = 'active'));

create policy "public read product images" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p
             where p.id = product_images.product_id and p.status = 'active')
    and (product_images.variant_id is null or exists (
          select 1 from public.product_variants v
           where v.id = product_images.variant_id and v.is_active)));

create policy "public read stock of active variants" on public.inventory
  for select to anon, authenticated using (
    exists (select 1
              from public.product_variants v
              join public.products p on p.id = v.product_id
             where v.id = inventory.variant_id and v.is_active and p.status = 'active'));

create policy "public read order statuses" on public.order_statuses
  for select to anon, authenticated using (true);

create policy "public read active payment methods" on public.payment_methods
  for select to anon, authenticated using (is_active);

create policy "public read delivery settings" on public.delivery_settings
  for select to anon, authenticated using (true);

create policy "public read active delivery regions" on public.delivery_regions
  for select to anon, authenticated using (is_active);

-- Settings are public by design: never store secrets in site_settings.
create policy "public read site settings" on public.site_settings
  for select to anon, authenticated using (true);

create policy "public read published pages" on public.pages
  for select to anon, authenticated using (is_published);

create policy "public read visible sections" on public.page_sections
  for select to anon, authenticated using (
    is_visible and exists (
      select 1 from public.pages pg where pg.id = page_sections.page_id and pg.is_published));

-- 3) Defence in depth: the anonymous role gets SELECT on the public tables only.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on
  public.categories, public.products, public.product_variants, public.product_images,
  public.inventory, public.order_statuses, public.payment_methods,
  public.delivery_settings, public.delivery_regions, public.site_settings,
  public.pages, public.page_sections
to anon;

-- ===== supabase/migrations/0004_storage.sql =====
-- =====================================================================
-- OMBRE store: Storage buckets and policies
--   product-images : product and colour photos (public read)
--   site-media     : logo, hero/About images and videos (public read)
-- Only admins can upload, replace or delete.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 8388608,
     array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('site-media', 'site-media', true, 52428800,
     array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml','video/mp4','video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "ombre public read files" on storage.objects
  for select to public
  using (bucket_id in ('product-images', 'site-media'));

create policy "ombre admins upload files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'site-media') and public.is_admin());

create policy "ombre admins update files" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'site-media') and public.is_admin())
  with check (bucket_id in ('product-images', 'site-media') and public.is_admin());

create policy "ombre admins delete files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'site-media') and public.is_admin());

-- ===== supabase/migrations/0005_defaults.sql =====
-- =====================================================================
-- OMBRE store: required starting data (all editable from the admin)
-- =====================================================================

-- Order statuses ("Cancelled" puts stock back automatically)
insert into public.order_statuses (key, label, color, sort_order, is_default, restocks_inventory) values
  ('pending',   'Pending',   '#b7791f', 10, true,  false),
  ('confirmed', 'Confirmed', '#227b92', 20, false, false),
  ('preparing', 'Preparing', '#6b46c1', 30, false, false),
  ('shipped',   'Shipped',   '#2b6cb0', 40, false, false),
  ('delivered', 'Delivered', '#2f855a', 50, false, false),
  ('cancelled', 'Cancelled', '#c53030', 60, false, true)
on conflict (key) do nothing;

-- Payment methods (cash on delivery only for now)
insert into public.payment_methods (key, label, description, provider, is_active, sort_order) values
  ('cod', 'Cash on delivery', 'Pay the courier in cash when your order arrives.', 'cod', true, 10)
on conflict (key) do nothing;

-- Delivery: flat fee at launch (change it in Admin > Settings)
insert into public.delivery_settings (id, is_enabled, flat_fee, free_delivery_threshold, notes)
values (1, true, 5, null, 'Delivery across Lebanon.')
on conflict (id) do nothing;

insert into public.delivery_regions (name, sort_order) values
  ('Beirut', 10), ('Mount Lebanon', 20), ('North Lebanon', 30), ('South Lebanon', 40),
  ('Nabatieh', 50), ('Bekaa', 60), ('Baalbek-Hermel', 70), ('Akkar', 80)
on conflict (name) do nothing;

-- Site settings
insert into public.site_settings (key, value, label, group_name) values
  ('brand_name',           '"OMBRE"'::jsonb,                        'Brand name',              'brand'),
  ('logo_path',            '""'::jsonb,                             'Logo (file in site-media)','brand'),
  ('contact_email',        '""'::jsonb,                             'Email',                   'contact'),
  ('contact_phone',        '""'::jsonb,                             'Phone',                   'contact'),
  ('whatsapp_number',      '"96171964944"'::jsonb,                  'WhatsApp number (digits, with country code)', 'contact'),
  ('instagram_url',        '"https://www.instagram.com/weareombre/"'::jsonb, 'Instagram URL',  'contact'),
  ('address',              '""'::jsonb,                             'Address',                 'contact'),
  ('footer_text',          '"Placeholder footer text."'::jsonb,     'Footer text',             'footer'),
  ('copyright_text',       '"OMBRE. All rights reserved."'::jsonb,  'Copyright text (year is added automatically)', 'footer'),
  ('announcement_enabled', 'false'::jsonb,                          'Show announcement bar',   'announcement'),
  ('announcement_text',    '"Announcement text goes here."'::jsonb, 'Announcement text',       'announcement'),
  ('currency_code',        '"USD"'::jsonb,                          'Currency code',           'store'),
  ('currency_symbol',      '"$"'::jsonb,                            'Currency symbol',         'store'),
  ('currency_position',    '"before"'::jsonb,                       'Symbol position (before/after)', 'store'),
  ('site_url',             '"http://localhost:3000"'::jsonb,        'Site URL',                'store'),
  ('site_language',        '"en"'::jsonb,                           'Language',                'store')
on conflict (key) do nothing;

-- Pages with placeholder sections only. The real story is entered in Admin > Website.
insert into public.pages (slug, title) values ('home', 'Home'), ('about', 'About') on conflict (slug) do nothing;

insert into public.page_sections (page_id, type, content, sort_order)
select p.id, v.type, v.content::jsonb, v.ord
from public.pages p
join (values
  ('home', 'hero', '{"title":"Headline placeholder","subtitle":"Placeholder text. Edit this in Admin > Website.","image_path":"","video_path":"","button1_label":"Shop","button1_href":"/shop","button2_label":"About","button2_href":"/about","text_align":"left"}', 10),
  ('home', 'text', '{"title":"Short introduction","body":"Placeholder text. Write a short introduction to the brand here.","align":"center"}', 20),
  ('home', 'featured_product', '{"title":"Featured product","body":"","product_id":"","button_label":"View product"}', 30),
  ('home', 'image_text', '{"title":"The idea","body":"Placeholder text. A short version of the brand idea goes here.","image_path":"","alt":"","image_side":"right","button_label":"Read more","button_href":"/about"}', 40),
  ('home', 'cta', '{"title":"Call to action placeholder","body":"Placeholder text.","button_label":"Shop now","button_href":"/shop"}', 50),
  ('about', 'hero', '{"title":"About","subtitle":"Placeholder text. The brand story is written in Admin > Website.","image_path":"","video_path":"","button1_label":"","button1_href":"","button2_label":"","button2_href":"","text_align":"left"}', 10),
  ('about', 'text', '{"title":"Who we are","body":"Placeholder text.","align":"left"}', 20),
  ('about', 'image_text', '{"title":"Why it was created","body":"Placeholder text.","image_path":"","alt":"","image_side":"left","button_label":"","button_href":""}', 30),
  ('about', 'image_text', '{"title":"The idea behind the product","body":"Placeholder text.","image_path":"","alt":"","image_side":"right","button_label":"","button_href":""}', 40),
  ('about', 'text', '{"title":"Our philosophy","body":"Placeholder text.","align":"left"}', 50),
  ('about', 'cta', '{"title":"Call to action placeholder","body":"Placeholder text.","button_label":"See the product","button_href":"/product"}', 60)
) as v(slug, type, content, ord) on v.slug = p.slug
where not exists (select 1 from public.page_sections s where s.page_id = p.id);

-- ===== supabase/seed_ombre.sql =====
-- =====================================================================
-- OMBRE starting data: the real product and store details from the live site.
-- Only confirmed facts. Everything here is editable in the admin afterwards.
-- Stock starts at 0: enter your real quantities in Admin > Inventory.
-- =====================================================================

-- Store details
update public.site_settings set value = v.value::jsonb
from (values
  ('contact_phone',        '"+961 71 964 944"'),
  ('footer_text',          '"A square folding shade, delivered anywhere in Lebanon. Pay in cash when it arrives."'),
  ('copyright_text',       '"OMBRE"'),
  ('announcement_enabled', 'true'),
  ('announcement_text',    '"Cash on delivery across Lebanon · $5 delivery"')
) as v(key, value)
where site_settings.key = v.key;

-- The Ombre, in Beige and Blue, $80
with p as (
  insert into public.products (name, slug, short_description, price, status, specs, sort_order)
  values ('Ombre', 'ombre', 'Square folding beach shade, 50 × 50 cm', 80, 'active',
          '[{"label":"Shape","value":"Square"},{"label":"Size","value":"50 × 50 cm"},{"label":"Frame","value":"Folding, wood"},{"label":"Colours","value":"Beige, Blue"}]'::jsonb, 10)
  on conflict (slug) do nothing
  returning id
), v as (
  insert into public.product_variants (product_id, name, hex_color, sort_order)
  select p.id, c.name, c.hex, c.ord from p, (values ('Beige', '#E8DFD1', 10), ('Blue', '#2AA7CC', 20)) as c(name, hex, ord)
  returning id, product_id, name
)
-- photos: the ones already on the site (paths starting with / are served from the website itself)
insert into public.product_images (product_id, variant_id, storage_path, alt_text, sort_order, is_featured)
select v.product_id, v.id, i.path, i.alt, i.ord, i.ord = 0
from v
join (values
  ('Beige', '/img/beige.jpg',        'Ombre in Beige',             0),
  ('Beige', '/img/beige-detail.jpg', 'Ombre Beige, frame detail',  1),
  ('Blue',  '/img/blue.jpg',         'Ombre in Blue',              0),
  ('Blue',  '/img/blue-detail.jpg',  'Ombre Blue, frame detail',   1)
) as i(variant, path, alt, ord) on i.variant = v.name
union all
select p.id, null, '/img/inuse.jpg', 'Two Ombres on the sand', 0, true from p;
