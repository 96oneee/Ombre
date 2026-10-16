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
