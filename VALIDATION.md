# Validation record — 31 October 2026

## Passed

- 27 HTML files checked (26 routes plus the host's standalone 404): internal links, one H1 per page, titles, descriptions, image alt text and parseable JSON-LD.
- JavaScript syntax checks for the public interface, Firebase integration and admin interface.
- Build security checks: draft listings excluded from public JSON and HTML, unsafe path identifiers rejected, preview indexing disabled.
- Firestore emulator access/schema tests: public writes denied, ordinary signed-in writes denied, administrator writes allowed, published records readable publicly, drafts private, unrestricted public collection query denied, negative prices and unsafe image URLs rejected, extra fields rejected and client-side role escalation denied.
- Rules tested with Firebase SDK 13.1.0 and rules-unit-testing 6.0.0 using Firestore emulator 1.19.8. The current CLI needs Java 21+, while the available test runtime used Java 17 and the standalone emulator.
- Desktop visual inspection of the home page. Responsive CSS covers narrow screens; physical iOS/Android device testing remains a launch check.
- Browser SDK URL for the pinned Firebase release returned HTTP 200.

## Boundaries

- No live Firebase project credentials were provided. Authentication provider settings, authorised domains, administrator claims, storage upload behaviour, App Check enforcement and deployment of backend rules remain unverified until owner setup.
- No actual enquiry was sent. No real customer records were entered into Firebase.
- The preview intentionally stays private and noindex. Public indexing requires the production-domain build.
- Admin changes reach the live Firestore catalogue after setup; static listing pages and the sitemap require export/rebuild/deployment.
- No penetration test, load test, Lighthouse score or guaranteed search ranking is claimed.
- This static website has no Node server at runtime. npm packages support trusted maintenance, tests and deployment; browser Firebase modules are loaded separately. See DEPENDENCY-AUDIT.md for current dependency advisories and remaining review work.

## Publishing upgrade verification

- Expanded Firestore emulator tests passed: post drafts private, published content readable, admin-only mutations, invalid gallery URLs and excess photos denied, popup schema limits enforced, direct client inbox writes denied.
- Static route/metadata checks and build-security checks passed.
- Live Firebase authentication, Storage uploads and callable delivery still require project-owner setup; no live deployment to Firebase was performed.

## Customer enquiry photos and location (1 November 2026)
- Updated Firestore emulator suite passed, including private media enquiry reads, allowed staff status updates and blocked photo-field mutations.
- Optional location range validation, photo format/count limits and JavaScript/static page checks passed.
- Live device geolocation and deployed callable delivery remain to be verified after Firebase activation on an HTTPS production domain. No location was requested from the test browser.

### Phone app update — 2 November 2026
Build and all 30 HTML checks passed. New PWA and service-worker JavaScript syntax checks passed; installation instructions and icon rendered in the preview browser. Manifest icon dimensions and local paths checked. No physical iPhone/Android or offline service-worker test is claimed; HTTP development preview does not provide secure-context installation.

Current source removes local test-workspace paths and starter catalogue records. Live authentication, uploads and enquiry delivery still require owner activation and live verification.
