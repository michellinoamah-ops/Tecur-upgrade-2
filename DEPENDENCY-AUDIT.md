# Dependency review — 31 October 2026

The npm audit completed after updating Firebase tooling and overriding @grpc/grpc-js to a patched compatible release (installed 1.14.7).

- Critical: 0
- High: 0
- Moderate: 15 affected package entries (including transitive parent packages, not 15 independent vulnerabilities).

These npm packages support the Firebase CLI, local tests and trusted administrator scripts. They are not bundled into the static site as a Node server. The browser uses the separately pinned Firebase 13.1.0 web modules. This distinction does not make maintenance tooling immune to risk.

Remaining moderate entries:

- `@google-cloud/pubsub`
- `@opentelemetry/core`
- `archiver`
- `archiver-utils`
- `exegesis`
- `firebase-tools`
- `gaxios`
- `glob`
- `google-gax`
- `minimatch`
- `readdir-glob`
- `rimraf`
- `superstatic`
- `uuid`
- `zip-stream`

The production-only npm audit before the final gRPC override reported four moderate entries in glob, google-gax, minimatch and rimraf. Do not describe this delivery as vulnerability-free or fully production-audited. Review upstream patches before using administrative scripts with sensitive credentials; avoid processing untrusted source archives with the CLI. Major-version overrides for unrelated transitive APIs were not forced because they can break the vendor tooling.

Backend rules, App Check enforcement, authorised domains and admin provisioning still require project-owner configuration. See LAUNCH-GUIDE.md and VALIDATION.md.
