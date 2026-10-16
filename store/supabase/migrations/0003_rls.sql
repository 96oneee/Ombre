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
