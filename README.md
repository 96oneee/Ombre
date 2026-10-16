# Ombre

Online store for **Ombre**, a square folding beach shade (50 × 50 cm, Beige and Blue), sold across Lebanon for $80 with $5 delivery and cash on delivery.

The same code runs on **Cloudflare Pages** (free, recommended) or **Netlify**. On either, the admin is at `/admin` behind a login, like the NO.KIT.LAB website.

- **Store**: `site/index.html`, one static page (home, product, shop, about, cart, checkout).
- **Admin**: `https://<your-site>/admin`. Orders, stock, price, delivery fee, WhatsApp number, email subscribers, and **Customize site**, a Shopify-style theme editor with sections and blocks, theme colours and fonts, a desktop and phone preview, undo, and draft then publish.
- **AI assistant**: *Admin → Ask AI* (or the sparkle in the editor). Type a change in your own words and it edits the draft in the preview; nothing goes live until you press Publish, and Undo reverses it. Price, delivery fee, WhatsApp number and stock changes are shown for you to confirm. Cloudflare only (see setup step 4).
- **Data**: orders, stock, settings, site edits and uploaded photos are saved online (Cloudflare KV, or Netlify Blobs on Netlify). Every visitor sees the same published site, and every order reaches the admin.

## One-time Cloudflare setup (free)

1. **Create the storage.** In the Cloudflare dashboard: *Storage & databases → KV → Create* a namespace named `ombre`.
2. **Connect the repository.** *Workers & Pages → Create → Pages → Connect to Git* → GitHub → `96oneee/Ombre`. Framework preset: **None**. Build command: leave empty. Build output directory: **site**. Save and deploy.
3. **Link the storage and set your password.** In the new Pages project: *Settings → Bindings → Add → KV namespace*, variable name **DATA**, namespace `ombre`. Then *Settings → Variables and secrets → Add*, type **Secret**, name **ADMIN_PASSWORD**, value = the admin password you want. Then *Deployments → Retry deployment* so the changes apply (any new commit pushed to `main` also redeploys).
4. **Turn on the AI assistant (optional).** *Settings → Bindings → Add → Workers AI*, variable name **AI**, then redeploy. This uses Cloudflare's free daily AI allowance. For smarter answers, add a Secret **ANTHROPIC_API_KEY** (a Claude API key from console.anthropic.com, paid per use) and the assistant uses Claude instead.

The live store is https://ombre-qad.pages.dev and the admin https://ombre-qad.pages.dev/admin. In general the store is at `https://<project>.pages.dev` and the admin at `https://<project>.pages.dev/admin`. To change the admin password, change the `ADMIN_PASSWORD` secret and redeploy.

## One-time Netlify setup (alternative)

1. **Connect the repository.** In Netlify open the project **ombre-lb** (already created), go to *Project configuration → Build & deploy → Continuous deployment → Link repository*, and pick `96oneee/Ombre`. Build settings come from `netlify.toml`. (Or use *Add new project → Import an existing project → GitHub → Ombre*.)
2. **Turn on the admin login.** *Project configuration → Identity* → **Enable Identity**. Set *Registration* to **Invite only**.
3. **Invite yourself.** *Identity → Invite users* → your email. Open the email, choose a password, and you land in the admin. Next time go to `https://<your-site>/admin` and log in.

Forgot the password? Use *Forgot your password?* on the login screen.

## Where things live

```
site/index.html                 the store and admin (built, do not edit by hand)
site/img/                       product photos and logo
site-source/store.src.html      source of the page; build with: python3 site-source/build.py
functions/                      Cloudflare Pages backend (orders, settings, site edits, photos, login), data in KV
functions/_lib/ai.js            the admin's AI assistant (Workers AI binding AI, or Claude with ANTHROPIC_API_KEY)
site/_redirects, site/_headers  /admin address and security headers (Cloudflare and Netlify)
netlify/functions/, netlify.toml  Netlify backend (same API), data in Netlify Blobs, login with Netlify Identity
store/                          an alternative full build (Next.js + Supabase), not used by the live site
```

## Opening the page without Netlify

Opening `site/index.html` straight from the disk (or in the Claude preview) runs a demo mode: everything works, but orders and edits are saved only in that browser, and the admin uses a local password instead of the Netlify login.

## Store details

- Price: $80 per Ombre, delivery $5 anywhere in Lebanon, cash on delivery
- Orders confirmed on WhatsApp: +961 71 964 944
- Instagram: [@weareombre](https://www.instagram.com/weareombre/)
