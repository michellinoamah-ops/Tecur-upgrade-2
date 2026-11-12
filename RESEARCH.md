# Tecur Automotive — research and launch brief

Researched 31 October 2026. Recommendations below are design judgments based on the primary sources linked here, not keyword-volume measurements or a guarantee of ranking.

## Recommended experience

Tecur's source site is a Toyota-focused service and parts business in Lekki, not a general vehicle dealership. Retain that distinction. Build a clear journey: understand the workshop → identify a service or part → check model/year suitability → contact or request an appointment. Give Home, Services, Parts, Ownership tools, Journal, About, Contact/Booking, Privacy and Admin their own useful URLs. Publish individual service and listing pages where sufficient original content exists. Avoid dozens of thin location pages repeating the same copy.

Useful tools include a model/year parts filter, saved shortlist, symptom-to-service routing, and a service-request summary. Explain that symptom guidance is not a mechanical diagnosis and fitment needs confirmation. Make booking a request until the workshop confirms availability. Keep call and WhatsApp actions reachable on mobile. Toyota's own owner experience prioritizes manuals, vehicle information, service scheduling and model-specific parts; this supports a task-led approach rather than animation for its own sake.[1]

Use a strong editorial automotive visual direction, real photography, large type and restrained accent colour. Animate navigation, reveal content and show meaningful state changes. Respect reduced-motion preferences, retain keyboard navigation and visible focus, and avoid scroll hijacking. Motion must never hide content if JavaScript fails.[2]

## Search architecture

Use real HTML pages, descriptive page titles, one clear page topic, crawlable `<a href>` navigation, sensible breadcrumbs, canonical URLs and a sitemap containing only production URLs. Make service and contact information visible in HTML before JavaScript. Avoid fabricated ratings, stock quantities or credentials. Use natural phrases such as “Toyota service in Lekki”, “Toyota parts in Lagos”, “Toyota alternator replacement” and “Toyota cooling system inspection” in genuinely relevant pages; these are intent hypotheses, not researched traffic estimates.[3][4]

Use AutoRepair/LocalBusiness structured data for verified business details. Keep name, address, phone and opening hours consistent with the business's real listings. Do not mark up the business's own testimonials as an aggregate review rating to seek review stars. Validate structured data and inspect production URLs in Google Search Console.[5]

Target good field Core Web Vitals: LCP within 2.5 seconds, INP below 200 ms and CLS below 0.1. Use responsive compressed images, reserve image dimensions, defer below-fold loading and avoid large animation libraries. These are targets requiring real measurements, not claims that the finished site achieves them.[6]

A private preview cannot be indexed. After the owner connects the public domain: replace preview canonical URLs, publish robots/sitemap settings, verify Search Console, submit the sitemap, inspect key pages and track real queries. Google explicitly provides no automatic first-place ranking guarantee.[3]

## Firebase and administrator security

Firebase browser configuration identifies a project; it does not establish administrator authority. Authentication plus restrictive database/storage rules must enforce authorization. Use a trusted server/Admin SDK to assign an admin custom claim. Never let a browser grant itself administrator status or rely on a hidden admin URL.[7]

Start database rules with default deny. Public reads should expose only published listings and approved public content. Allow listing create/update/delete only to authenticated administrators. Validate field types, lengths, status values and numeric ranges. Keep customer enquiries private. Test unauthorized reads/writes and role boundaries with Firebase emulators before public launch.[8]

For uploaded media, restrict uploader role, path, size and MIME types. Do not permit public arbitrary-file uploads. Exclude active SVG/HTML content unless a separate sanitization system is used. File metadata checks are useful but do not constitute malware scanning.[9]

Enable App Check for supported services after registering the real production domains. App Check complements authentication and rules. It does not replace either. Configure auth authorized domains, email-enumeration protection if using passwords, appropriate quotas, budget alerts and monitoring. Consider Identity Platform MFA for administrators. These console-side controls require project-owner access and are not activated merely by shipping a configuration file.[8][10]

## Photography

Unsplash's ordinary license permits broad free commercial copyright use, but Unsplash+ is a separate offering. Keep source/photo/license records and do not imply that stock photographs show Tecur's actual workshop, team or available stock. Trademark, privacy and model-release rights are distinct from the copyright license. Prefer stock photos without identifiable people and avoid any suggestion that Tecur is an authorized Toyota dealer unless verified.[11][12]

## Required owner verification before public launch

- Confirm primary phone/WhatsApp numbers: the original file contains different contact numbers.
- Confirm address, opening hours, service coverage, parts sourcing, pricing and any warranty terms.
- Replace illustrative listings with genuine inventory and actual fitment data.
- Enable Firebase products and deploy/test the included rules, indexes and any server functions; grant the initial administrator securely.
- Confirm privacy handling and retention for customer requests; do not collect unnecessary sensitive data.
- Set production domain and SEO origin; replace stock imagery with real workshop imagery when available.
- Measure performance and accessibility on actual Android/iOS devices and validate the full signed-in admin path.

## Primary sources

1. Toyota Owners: https://www.toyota.com/owners
2. web.dev, Animation and motion: https://web.dev/learn/accessibility/motion
3. Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
4. Google crawlable links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
5. Google LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business
6. Google Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
7. Firebase custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
8. Firebase security checklist: https://firebase.google.com/support/guides/security-checklist
9. Firebase Storage rules conditions: https://firebase.google.com/docs/storage/security/rules-conditions
10. Firebase App Check: https://firebase.google.com/docs/app-check
11. Unsplash license: https://unsplash.com/license
12. Unsplash releases and trademarks: https://help.unsplash.com/en/articles/2612329-releases-and-trademarks

## Customer privacy and optional geolocation — 1 November 2026
Plain-English notice informed by the Nigeria Data Protection Commission's published Act and rights guidance: https://ndpc.gov.ng/ndp-act-2023/ and https://forms.ndpc.gov.ng/dsar-request/ . It describes optional photo/location consent, purposes, recipients, retention criteria, rights and complaints. Operational details require business verification.
Geolocation permission and HTTPS behavior: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition . Callable protection: https://firebase.google.com/docs/functions/callable .

Phone app implementation references (2 November 2026):
- Apple: https://support.apple.com/en-eg/guide/iphone/iphea86e5236/ios — Safari home-screen installation and Open as Web App.
- MDN: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable — manifest, secure origins and browser-dependent installation.
