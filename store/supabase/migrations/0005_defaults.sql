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
