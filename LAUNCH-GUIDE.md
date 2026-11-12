# Tecur Automotive launch guide

## 1. Verify business facts

The original file supplied **+234 708 599 0547** for telephone and **+234 704 396 6114** for WhatsApp. Both are preserved for their separate channels. Confirm both, the address (2 Lawal St, Lekki Peninsula II, Lagos 106104) and Monday–Saturday 8am–6pm hours before public launch. No unverified review stars or promises of one-hour attendance have been carried into the new site.

Use the final domain you own. The private preview URL is not intended to be indexed by Google.

## 2. Activate Firebase safely

1. Open project `tecur-automotive` in the Firebase console. Confirm the web app configuration exactly matches `dist/assets/config.js`; the copied Markdown URL wrappers and escaped underscore have been normalised.
2. Enable Email/Password in Authentication. Create the administrator user through the console; there is intentionally no public admin sign-up form. Enable email enumeration protection, a strong password policy and the available account protections. For MFA, configure Identity Platform and implement/enrol a supported second factor before claiming the site has MFA; this build does not implement an MFA challenge flow.
3. Add your final site hostname and any private preview hostname you will use to Authentication's authorised domains. Restrict the browser API key to the needed web origins and Firebase APIs after testing. A web API key is public; rules and claims provide authorization.
4. Create a Firestore database and provision Cloud Storage if not already present. Verify the storage bucket name and any billing requirements. Do not start with open test rules.
5. Install supported Node tooling with `npm install`. From a trusted terminal authenticated to the correct Google project, use `firebase deploy --only firestore:rules,storage --project tecur-automotive`. Review existing data/rules before deployment because the included rules intentionally deny unmodelled collections.
6. Assign the admin claim from a trusted environment with Application Default Credentials: `node scripts/grant-admin.mjs FIREBASE_AUTH_USER_UID`. Use the UID from Firebase Authentication. The script preserves existing claims. Sign out and back in. Never expose service-account JSON in client code.
7. Register your domain in Firebase App Check using reCAPTCHA Enterprise. Put the public site key in `dist/assets/config.js`, test traffic, then enforce App Check for the supported resources you use, including Firestore and Storage. App Check is not active until you supply that key and enable enforcement. Check allowed origins and CSP for your configuration.
8. Sign in, create a draft listing, upload a small photo, publish it, view it in a separate signed-out browser, edit it, then archive it. Confirm signed-out users cannot read drafts, requests or settings and cannot write listings. Run the included rule emulator tests before launch.
9. Set budget alerts, monitor abuse and denied requests, enable appropriate backups and document administrator revocation. All admins have the same business-wide role; there is no multi-tenant isolation or staff role hierarchy.

## 3. Image storage and access

Uploads are limited by client and Storage rules to JPEG/PNG/WebP under 5 MB; SVG uploads are rejected. MIME checks do not perform malware scanning or verify file signatures. Production hardening can add trusted image decoding/re-encoding and orphan-image cleanup. Firebase download URLs act as shareable image links; never upload confidential material or documents as listing photos. Revoking a draft's access rule does not revoke an already shared download token automatically.

Only publish photos you can use. The included stock photography is clearly illustrative. See CREDITS.md. Use actual product photos for individual sale listings and commissioned workshop photos when available.

## 4. Public build and SEO

Set the real canonical origin and enable indexing when the public site is ready:

```bash
SITE_URL=https://YOUR-REAL-DOMAIN PUBLIC_SITE=1 python3 scripts/build.py
npm run check
firebase deploy --only hosting --project tecur-automotive
```

For Windows PowerShell:

```powershell
$env:SITE_URL='https://YOUR-REAL-DOMAIN'
$env:PUBLIC_SITE='1'
python scripts/build.py
npm run check
firebase deploy --only hosting --project tecur-automotive
```

The production build enables indexing for appropriate pages, creates canonical URLs and the sitemap for that domain, and retains `noindex` for admin/live-query pages. Add the domain in Firebase Hosting and configure DNS/HTTPS. Security headers are included in `firebase.json` and `dist/_headers`; verify the host actually emits them. Do not remove a security header simply to make an error disappear—fix the allowed sources precisely.

Live admin edits update Firestore but do not automatically rebuild static pages. Export and rebuild after adding, editing or archiving listings, or arrange a trusted deployment pipeline to run `npm run sync` and build. Keep cloud credentials in the deployment platform’s secret store. Never include draft/private requests in public exports.

Create/verify Google Search Console for the final domain, submit `/sitemap.xml`, inspect key URLs and monitor indexing. Claim/update the real Google Business Profile with matching name/address/phone and authentic workshop photos. Add original, useful guides and ask real customers for honest reviews; do not invent ratings. Measure real Core Web Vitals and mobile usability after deployment. Fast templates and metadata alone cannot guarantee ranking.

## 5. Operations and data

Booking opens a reviewed message in WhatsApp; the customer still presses Send. There is no payment processing, live appointment calendar, automated WhatsApp inbox, mechanical AI diagnosis or automatic admin role enrollment. The request tracker receives direct enquiries after callable deployment; staff can also enter requests manually. WhatsApp messages are not automatically imported. Limit exports and remove records when no longer needed.

Local vehicle data is stored on the visitor’s browser only. It is not an encrypted cloud garage. Clear data on shared devices. Public listing data is rendered as text rather than injected HTML; static build values are escaped and record IDs validated.

## 6. Before claiming production readiness

Complete live authentication/storage/App Check checks, run the security rules tests in your environment, verify headers, confirm contact details and media rights, test an actual phone including iOS Safari, measure performance, review privacy wording and verify the published sitemap. No penetration test or live Firebase security audit has been performed from the client configuration alone.

## 7. Activate direct enquiries and publishing

Deploy the updated Firestore and Storage rules before using the new admin panels. In `functions/`, run `npm install` with Node 22, then from the project root run `firebase deploy --only functions --project tecur-automotive`. A billing-enabled Firebase project may be required. Configure reCAPTCHA Enterprise App Check and the site key as above; the callable requires valid App Check tokens. Region: europe-west1. The function validates inputs, rejects the honeypot, limits attempts to five per hour per hashed IP/app bucket and applies a 15-second cooldown. Enable Firestore TTL on `_enquiryLimits.expiresAt` for housekeeping. Monitor costs and abuse; shared networks can share a limit.

Test a real direct enquiry, verify its arrival in the private admin inbox and update its status. No email notification or automated WhatsApp sending is implemented. Without App Check configuration the direct button clearly reports that delivery is not active and offers WhatsApp.

Published blog and pop-up content is public. Blog/popup image paths are public media, including images uploaded while drafting: never upload private documents. Raw imported files are processed locally; sanitized content and embedded images are uploaded only on save in live mode. Only authorized administrators can write. Images and tables are preserved semantically, not as exact Word page layouts.

Run `npm run sync` and rebuild after publishing or archiving content to update static SEO pages. Live articles appear immediately through Firebase; full static SEO pages require that export/build step. The downloadable build defaults to `SITE_PREVIEW=0`; do not enable the preview flag for public production.

## Customer photos and optional location
Deploy all three callable functions (`submitEnquiry`, `updateEnquiryLocation`, `getEnquiryPhoto`) and updated Firestore rules. Photos are compressed locally, sent on explicit submission, saved under private `enquiry-media/` paths, and returned only through an administrator-authorized callable. No public image download tokens are created. Image signature checks and size limits are included. The server decodes and re-encodes each image before storage, discarding metadata. This is not a general malware scanner. Enable TTL for `_enquiryTracking.expiresAt`; add an operational retention/deletion process for enquiry documents and their related storage objects.

Location requires HTTPS, customer permission and `geolocation=(self)` in Permissions-Policy. No location is requested on page load. Optional live sharing starts after direct submission, expires after 30 minutes, supports stopping, and sends the latest position rather than a travel history. Background phones may suspend updates. Test on real Android and iOS devices before launch. WhatsApp requires users to attach their photos and start live sharing in WhatsApp separately.

The customer privacy page is a plain-English draft for the described workflow. Confirm actual retention, service providers, international processing safeguards and service terms with the business before public launch. No backend or staff setup content appears on that page.

## Installable phone app (2 November 2026)
The site now includes an installable progressive web app for iPhone/iPad and Android, with `/app/` instructions, 180/192/512px branded icons, standalone launch, safe-area spacing, large touch controls and a mobile navigation dock. This is not an App Store or Google Play submission.
Serve the site over HTTPS at the domain customers will use, with `manifest.webmanifest` and root `sw.js` accessible. Keep sw.js revalidated (Cache-Control: no-cache). The service worker caches only an offline information screen, styling and fixed branding; it never caches customer enquiries, photos, locations, admin pages or live listings. It does not queue or send messages offline. Private preview sign-in may prevent anonymous offline asset installation; validate on the final public HTTPS domain. No notification permission is requested.
On a physical iPhone, open Safari → Share → Add to Home Screen → Open as Web App if shown → Add. Check launch icon, standalone navigation, portrait/landscape layout, safe-area spacing, keyboard behaviour, photo selection, and explicit location permission. On Android check Chrome installation when offered. Test offline/reconnect after one online visit and app reopen; current content and sending require a connection. Close and reopen all app windows to activate a new worker version. Increment the worker cache version when changing its offline shell.
The browser may suspend live location in the background; keeping the app open is required. Existing App Check/Auth/Functions setup remains required for live delivery. Physical iOS/Android installation, HTTPS service worker operation and device geolocation have not been exercised in the development browser.
