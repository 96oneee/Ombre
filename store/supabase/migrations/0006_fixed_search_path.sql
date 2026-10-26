-- =====================================================================
-- OMBRE store: pin search_path on the helper functions (Supabase security advisor)
-- =====================================================================

alter function public.normalize_phone(text) set search_path = public;
alter function public.gen_order_number() set search_path = public;
alter function public.set_updated_at() set search_path = public;
