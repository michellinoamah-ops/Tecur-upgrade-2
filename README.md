# Tecur Automotive — website upgrade

A complete multi-page website for the Toyota service and parts business in the supplied HTML. The original business details are retained. The upgrade does not invent a dealership inventory, ratings, customer counts or manufacturer accreditation.

## Open the preview

Private preview: https://tecur-automotive-studio.michellinoamah.chatgpt.site

## What's included

- 27 routes: home; services hub; six service details; catalogue; four initial category details; live listing viewer; My Toyota tools; booking; about; contact; field notes and three articles; privacy; credits; admin; 404.
- Official Tecur logo with navy / red / white design, responsive layouts, scroll reveals, animated brand ribbon, quick-navigation command palette, cross-page transitions where supported, reduced-motion support.
- Local WebP photography, responsive variants, explicit dimensions and lazy loading below the fold.
- Search and filter by parts/model/category, saved items, vehicle passport, prefilled service requests, checklist and editable running-cost estimates.
- Enquiries can be sent to the private admin inbox through the included App Check-protected callable function, or reviewed and sent through WhatsApp. Live direct delivery requires backend activation.
- Firebase admin integration for create/edit/duplicate/archive listings, draft/published states, prices, fitment, up to 12 gallery photos, direct and manual request tracking, internal settings and JSON export.
- Firebase custom-claim rules, data validation, private operational collections, upload limits, hosting headers and deny-by-default fallback.
- Pre-rendered HTML, unique titles/descriptions, canonical links, social cards, AutoRepair schema and sitemap generator.

## Quick local preview

Requirements: Python 3.11+ and Node 22 LTS (Java 21+ for current Firebase emulators) for maintenance commands. Static public pages require no npm installation to serve.

```bash
python3 scripts/build.py
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. Use HTTP serving, not double-click/file://. Public site pages are in `dist/`; page templates/content are in `scripts/build.py`, interactive code in `dist/assets/`, and static catalogue data in `data/catalog.json`.

## Important activation boundary

The supplied Firebase web config is wired in. It is public client configuration, not an administrator credential. This delivery does **not** change the project's Authentication providers, Firebase rules, App Check, cloud storage bucket or admin claims. Live access cannot be verified until the project owner completes `LAUNCH-GUIDE.md`.

The private preview intentionally has `noindex` and blocks crawlers. This is not the public SEO configuration. Build for the real domain using the instructions in the launch guide. Rankings are not guaranteed.

## Commands

```bash
npm install
npm run check
npm run test:rules
node scripts/grant-admin.mjs YOUR_FIREBASE_AUTH_UID
npm run sync
```

The last two commands require trusted local Google Application Default Credentials with the required project permissions. Never put service-account keys into `dist`, Git or the ZIP. Do not grant visitors administrator roles.

## Catalogue workflow

Add/edit in the live admin → publish → changes appear through Firestore in the live catalogue. For full search-friendly static listing pages, export catalogue JSON into `data/catalog.json`, or run `npm run sync` from a trusted environment, then rebuild and deploy. Rebuilding clears old generated routes so archived items do not persist as old static pages. Unpublished records are excluded from generated pages and the public JSON.

The initial categories are enquiry guides, not a claim of available stock. Replace them with verified listings and real product photos as desired. Item compatibility and availability must be confirmed.

## Files to read

- `LAUNCH-GUIDE.md`: Firebase, public deployment, security and SEO setup.
- `RESEARCH.md`: source-based design, SEO and security rationale.
- `CREDITS.md`: photograph source URLs and licence notes.
- `VALIDATION.md`: checks performed and remaining verification.
- `firestore.rules` and `storage.rules`: deployable backend access rules.

The source ZIP is independent of Sites hosting. Firebase Hosting is configured; other static hosts can serve `dist` if they support directory index pages and the included security headers. The `.openai` identity belongs to the provided private preview, not to a new deployment you create elsewhere.

## Publishing upgrade

Admin → Blog posts supports rich formatting, images, tables and imports of DOCX, HTML and TXT files (5 MB). Imported content is sanitized. Review conversion before publishing; PDF and legacy DOC require conversion to DOCX. Published posts appear on the home page and Field notes, with a full article reader. Export content to `data/content.json`, or run `npm run sync`, then rebuild for crawlable static article URLs.

Admin → Pop-ups provides four templates, page targeting, delay/scroll triggers, start/end schedules, priority and session/daily/always frequency. Preview before publishing. Listings support up to 12 images with thumbnails, swipe and optional slideshow playback.


Admin access requires an authorised staff account. The catalogue starts empty. Add your own listings in the admin panel. Article and campaign previews remain available while editing.
