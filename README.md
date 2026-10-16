# Ombre

Online store for **Ombre**, a square folding beach shade (50 × 50 cm, Beige and Blue), sold across Lebanon for $80 with $5 delivery and cash on delivery.

Set up like the NO.KIT.LAB website: Netlify hosts the site, and the admin at `/admin` has a real login (Netlify Identity, invite only).

- **Store**: `site/index.html`, one static page (home, product, shop, about, cart, checkout).
- **Admin**: `https://<your-site>/admin`. Orders, stock, price, delivery fee, WhatsApp number, email subscribers, and **Customize site**, a Shopify-style theme editor with sections and blocks, theme colours and fonts, a desktop and phone preview, undo, and draft then publish.
- **Data**: orders, stock, settings, site edits and uploaded photos are saved online in Netlify Blobs by the functions in `netlify/functions/`. Every visitor sees the same published site, and every order reaches the admin.

## One-time Netlify setup (lab owner steps, done once)

1. **Connect the repository.** In Netlify open the project **ombre-lb** (already created), go to *Project configuration → Build & deploy → Continuous deployment → Link repository*, and pick `96oneee/Ombre`. Build settings come from `netlify.toml`. (Or use *Add new project → Import an existing project → GitHub → Ombre*.)
2. **Turn on the admin login.** *Project configuration → Identity* → **Enable Identity**. Set *Registration* to **Invite only**.
3. **Invite yourself.** *Identity → Invite users* → your email. Open the email, choose a password, and you land in the admin. Next time go to `https://<your-site>/admin` and log in.

Forgot the password? Use *Forgot your password?* on the login screen.

## Where things live

```
site/index.html                 the store and admin (built, do not edit by hand)
site/img/                       product photos and logo
site-source/store.src.html      source of the page; build with: python3 site-source/build.py
netlify/functions/api.mts       admin API (needs login): orders, settings, site edits, photos
netlify/functions/checkout.mts  public API: place an order, subscribe by email
netlify/functions/media.mts     serves photos uploaded in the editor
netlify.toml                    Netlify settings (publish folder, /admin address)
store/                          an alternative full build (Next.js + Supabase), not used by the live site
```

## Opening the page without Netlify

Opening `site/index.html` straight from the disk (or in the Claude preview) runs a demo mode: everything works, but orders and edits are saved only in that browser, and the admin uses a local password instead of the Netlify login.

## Store details

- Price: $80 per Ombre, delivery $5 anywhere in Lebanon, cash on delivery
- Orders confirmed on WhatsApp: +961 71 964 944
- Instagram: [@weareombre](https://www.instagram.com/weareombre/)
