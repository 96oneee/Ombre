# OMBRE store

A database-backed online store: public website, cart, checkout (cash on delivery), orders, inventory and an admin dashboard with a section-based website editor.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Supabase (Postgres, Auth, Storage) · Vercel

> Status: Stage 1A. This code was written without being able to run `npm install` or connect to Supabase, so **it has not been run end to end yet**. The first `npm run build` and the test checklist at the bottom are how we find the remaining issues.

---

## Preview without a database

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the storefront runs on the preview data in `src/lib/demo.ts` (only confirmed OMBRE facts: $80, $5 delivery, Beige and Blue, 50 × 50 cm). Orders are refused and the admin stays closed until the database is connected.

## Homepage: The Art of Shade

`src/app/(site)/page.tsx` renders five chapters from `src/components/home/`: the entrance (`EntranceSun`: the OMBRE wordmark, a Beige/Blue picker that unfolds the chosen real Ombre, and a sun that crosses the sky as you scroll and opens into the hero; the site header stays hidden until then), product discovery, choose your shade, how it works (real photos), and effortless shopping. Their words and images come from `src/lib/home.ts`; a JSON object saved as the `home` row in `site_settings` overrides any of them. Animation uses GSAP and switches off with the reduced-motion setting.

**To do:** the unfold in the entrance is an effect made from the still cutouts (`public/img/*-cutout.webp`). Replace it with real footage of the Ombre unfolding once the video is filmed.

## 1. Requirements

- Node.js 20 or newer (`node -v`)
- A free Supabase account and a new, empty Supabase project
- Git (for GitHub and Vercel later)

## 2. Set up the database

In the Supabase dashboard open **SQL Editor** and run these files **in this order**, one at a time (paste the file contents, press Run). Run each only once, on a fresh project:

| # | File | What it does |
|---|------|--------------|
| 1 | `supabase/migrations/0001_schema.sql` | All tables, constraints, indexes, timestamps |
| 2 | `supabase/migrations/0002_functions.sql` | `place_order`, admin functions, order-number generator, views |
| 3 | `supabase/migrations/0003_rls.sql` | Row Level Security (who can read/write what) |
| 4 | `supabase/migrations/0004_storage.sql` | Storage buckets and upload policies |
| 5 | `supabase/migrations/0005_defaults.sql` | Order statuses, cash on delivery, delivery fee and regions, settings, placeholder Home and About sections |
| 6 (optional) | `supabase/seed_placeholder.sql` | One placeholder product with two placeholder colors, for testing |

If a script fails, stop and send me the exact error message. Do not skip ahead.

### Storage buckets

Created for you by `0004_storage.sql`:

- `product-images` (public read, admin-only upload) for product and color photos
- `site-media` (public read, admin-only upload) for logo, hero and About images/videos

Check them in **Storage** in the dashboard. If `0004` fails on the `storage.objects` policies, create the two buckets by hand (Storage > New bucket, tick **Public**), then re-run only the four `create policy` statements.

### Turn off public sign-ups

**Authentication > Sign In / Providers > Email**: switch off **Allow new users to sign up**. (Even if left on, only users listed in `admins` can enter the dashboard, but there is no reason to allow strangers to create accounts.)

## 3. Create the first admin

1. Supabase dashboard > **Authentication > Users > Add user > Create new user**. Enter your email and a strong password and tick **Auto Confirm User**.
2. In the **SQL Editor** run (with your email):

```sql
insert into public.admins (user_id, email, role)
select id, email, 'owner' from auth.users where email = 'you@example.com';
```

Only users with a row in `public.admins` can open `/admin`. Being logged in is not enough.

## 4. Configure and run locally

```bash
cd ombre-store
cp .env.example .env.local
```

Open `.env.local` and fill in the two Supabase values from **Project Settings > API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (the "anon public" key)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Only the **anon** key is used. The **service-role key is never needed** and must never be added to this project.

```bash
npm install
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin/login

Useful checks:

```bash
npm run typecheck   # TypeScript
npm test            # pricing/utility logic tests
npm run build       # production build (run this before deploying)
```

## 5. Deploy

1. Create a GitHub repository and push this folder (`.env.local` is git-ignored).
2. On vercel.com: **Add New > Project**, import the repository.
3. Under **Environment Variables** add the same three variables (use your real domain for `NEXT_PUBLIC_SITE_URL`).
4. Deploy.
5. In Supabase **Authentication > URL Configuration** set **Site URL** to your Vercel/domain URL.
6. In Admin > Settings set **Site URL** to the same address.

## 6. How it works

- **Colors are data.** Every color is a row in `product_variants` (name, hex, SKU, price override, sale price, active, sort order, stock, photos). Add a color in Admin > Products and it appears on the Product and Shop pages with its own gallery. No code changes.
- **Prices are never trusted from the browser.** Checkout sends only variant IDs and quantities to `place_order()`. The database re-checks that the product and color are active, reads current prices, checks and locks stock, applies the discount, reads the delivery fee from settings, then creates the order, items, stock reduction, stock movements and history in one transaction. Any failure rolls everything back.
- **Order numbers are random** (for example `OM-7K3QX9PD`), not sequential. `/order/[number]` is reachable by anyone who has the number, so numbers must not be guessable. The public confirmation does not include phone or email.
- **Security:** Row Level Security is on for every table. The public can only read active/published content and cannot write anything directly. Admin access requires a row in `admins`, checked in the middleware, in every admin page and server action, and in the database policies.
- **Delivery:** fee, free-delivery threshold, regions (with optional per-region fees), availability and notes all live in the database (Admin > Settings).
- **Payments:** `src/lib/payments/` defines a provider interface. Cash on delivery is the only provider. Adding Stripe or a local gateway means adding a provider file and a row in `payment_methods`; checkout does not change.
- **WhatsApp:** simple click-to-chat links (`wa.me`). The number comes from Admin > Settings. No WhatsApp Business API.
- **Website editor:** pages (Home, About) are ordered lists of sections: Hero, Text, Image, Image + text, Featured product, Call to action, Gallery. Edit, hide, reorder, add and delete them in Admin > Website. New section types are added in `src/lib/sections.ts`.

## 7. Changing fonts (Hastina, Visby CF)

The site currently uses placeholder Google fonts (Cormorant Garamond and Outfit). To use your own font files, put them in `public/fonts/` and in `src/app/layout.tsx` replace the two `next/font/google` blocks with `next/font/local`, keeping the same CSS variable names:

```ts
import localFont from "next/font/local";

const display = localFont({ src: "../../public/fonts/Hastina.woff2", variable: "--font-display" });
const body = localFont({ src: "../../public/fonts/VisbyCF-Regular.woff2", variable: "--font-body" });
```

Check that the licence of each font allows website use before uploading it.

## 8. Known limitations (Stage 1A)

- Not yet run against a real Supabase project (see the status note at the top).
- English only, single currency at a time. Language and currency are stored in settings, but there is no translation system yet.
- No dark mode.
- No email and no WhatsApp automation (by design for now).
- Discount codes can be created, paused and deleted but not edited after creation.
- Product photos are shown at their uploaded size; there is no automatic resizing yet. Upload web-sized images (about 2000 px on the long side).
- Image and section reordering uses up/down buttons, not drag and drop.
- Deleting a color or product removes its photos from storage; past orders keep their own copy of names and prices.
- Discount code checking has no rate limit. Fine for launch, worth adding later.
- If you add tables later in the Supabase dashboard, remember they start with broad default permissions: enable Row Level Security on them.

## 9. Test checklist (Stage 2)

Do these in order and tell me what happens at each step.

**Setup**
1. All SQL files ran without errors.
2. `npm run dev` starts. http://localhost:3000 shows the Home page with placeholder sections.
3. http://localhost:3000/admin redirects you to the login page when logged out.
4. Sign in with your admin user. The dashboard opens.
5. Sign in with a normal (non-admin) Supabase user, if you have one: you must be refused.

**Products and colors**
6. Admin > Products > Add product. Set name and price, set status to Active.
7. Rename the "Default" color, set a hex code and stock, save.
8. Add a second color with a different hex code and stock.
9. Upload photos for each color. Reorder them, set a main photo, replace one, delete one.
10. Open `/shop`, `/product` and `/product/your-slug`: both colors appear, each with its own gallery.
11. Add a third color in Admin. Reload the product page: it appears with no code change.
12. Untick "Show on website" on a color: it disappears from the site.

**Cart and checkout**
13. Add items in two colors, change quantities, remove one. Refresh the page: the cart persists.
14. Check the subtotal, delivery fee and total. Change the delivery fee in Admin > Settings and confirm the cart updates.
15. Checkout with empty fields: errors appear. Fill in valid details and place the order.
16. You land on `/order/OM-XXXXXXXX` showing items, totals, payment method, status and a WhatsApp button.

**Orders and stock**
17. Admin > Inventory: stock dropped by the ordered quantities and a movement was logged.
18. Admin > Orders: the order is there. Open it: customer, items, history. The "Message customer on WhatsApp" button opens a chat.
19. Change the status to Confirmed, then Cancelled. Stock goes back up.
20. Admin > Customers: the customer exists with one order.
21. Try to order more than the stock: a clear "Only N left" message.
22. Create a discount code in Admin > Discounts and apply it at checkout.

**Website editor and settings**
23. Admin > Website > Home: edit a hero title, upload an image, hide a section, move one, add one. Check the site.
24. Admin > Settings: change the brand name, WhatsApp number, footer and announcement. Check the site.
25. Admin > Media: upload and delete a file.

**Security spot checks**
26. Logged out, open `/admin/products`: redirected to login.
27. In the browser, `/order/OM-AAAAAAAA` (a made-up number) shows "not found".
