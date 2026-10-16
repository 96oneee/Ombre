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
