-- OPTIONAL: one placeholder product so you can test the storefront before adding real ones.
-- Delete it from Admin > Products when you are ready to launch.
with p as (
  insert into public.products (name, slug, short_description, description, price, status, specs, sort_order)
  values ('Sample product', 'sample-product', 'Placeholder short description.',
          'Placeholder description. Replace it in Admin > Products.', 50, 'active',
          '[{"label":"Dimensions","value":"Placeholder"}]'::jsonb, 10)
  on conflict (slug) do nothing
  returning id
)
insert into public.product_variants (product_id, name, hex_color, sku, sort_order)
select p.id, v.name, v.hex, v.sku, v.ord
from p, (values ('Color 1', '#d9d4c3', 'SAMPLE-1', 10), ('Color 2', '#7aa7b5', 'SAMPLE-2', 20)) as v(name, hex, sku, ord);

update public.inventory set quantity = 10
where variant_id in (select id from public.product_variants where sku in ('SAMPLE-1','SAMPLE-2'));
