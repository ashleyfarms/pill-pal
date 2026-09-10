# Pill Pal

Phone-first Help-Pal app: type a medication → see **what it’s for**, **known side effects** (common vs serious), and **related news headlines**.

> **Not medical advice.** Educational info from public labeling and news only. No accounts. No dosing advice.

## Live / deploy

**Live:** https://ashleyfarms.github.io/pill-pal/

Push is to [`ashleyfarms/pill-pal`](https://github.com/ashleyfarms/pill-pal). Deployed via GitHub Actions → GitHub Pages (`base: '/pill-pal/'`).

### GitHub Pages

Workflow: `.github/workflows/deploy-pages.yml` builds with Vite and publishes `dist` on every push to `main`.

### Netlify (optional — enables `/api/news` function)

1. Log into [Netlify](https://app.netlify.com/) and **Add new site → Import an existing project**.
2. Choose GitHub → `ashleyfarms/pill-pal`.
3. Build settings (already in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Deploy. Site should be **Public** (Site configuration → Access control → no password / no JWT gate).
5. Optional custom domain via Help-Pal DNS.

Or CLI (if you have a Netlify auth token):

```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

Local with functions:

```bash
npm i -g netlify-cli
netlify dev
```

## APIs used

| Source | Purpose |
|--------|---------|
| [RxNorm REST](https://rxnav.nlm.nih.gov/) | Brand/generic resolve, RxCUI, related names |
| [openFDA Drug Label](https://open.fda.gov/apis/drug/label/) | Indications, adverse reactions, boxed warnings |
| [DailyMed](https://dailymed.nlm.nih.gov/) | Deep-link to full SPL when `setid` present |
| [Google News RSS](https://news.google.com/rss/search?q=...) | Related headlines (via Netlify function `/api/news`) |

No API keys required for these public endpoints.

## Try a sample search

1. Open the deployed site (or `npm run dev` / `netlify dev`).
2. Search **`ibuprofen`**, **`metformin`**, or **`Lipitor`**.
3. Confirm sections: What it’s for · Known side effects · Related news · Sources.

## Scripts

```bash
npm install
npm run dev      # Vite only (news empty without Netlify function)
npm run build    # must pass
npm run preview
```

## Stack

Vite + React + TypeScript · Netlify static + serverless news proxy · warm Help-Pal UI (coral + Playfair/Inter).

## Tester gift unlocks

Albert and David can unlock a gift/tester flag (persists in localStorage + IndexedDB backup for iPhone home-screen PWAs):

- `?gift=albert` (also `ashley` → Albert)
- `?gift=david`

Or use the on-screen **Have a gift code?** box. Codes are case-insensitive: `albert`, `ashley`, `david`.

Public free search stays open for everyone else. If a paywall is added later, gift unlocks it as active.

GitHub Pages: https://ashleyfarms.github.io/pill-pal/?gift=albert

## Pill Pal Plus (Stripe)

- **$1.99/mo** after a **14-day free trial** via Stripe Payment Link.
- Gift unlocks (albert / ashley / david) keep full access forever.
- Free users can search; full indications, side effects, and news require gift or Plus.
- Local unlock after `?checkout=success` (localStorage + IndexedDB), same receipt pattern as GigKeep / Scale Pal.
- Payment Link placeholder: `REPLACE_ME_STRIPE_LINK` in `src/lib/billing.ts` (or `VITE_STRIPE_PAYMENT_LINK`).

