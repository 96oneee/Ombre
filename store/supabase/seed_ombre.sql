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
