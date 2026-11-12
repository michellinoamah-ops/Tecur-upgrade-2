# Editing and GitHub

Open TECUR.code-workspace in VS Code. The archive extracts directly into your chosen project folder. HTML now has line breaks and indentation. Word wrap is enabled for this workspace. Alt+Z toggles wrapping; Shift+Alt+F formats the current HTML file on Windows.

After installing project dependencies with `npm install`, run `npm run build` to regenerate formatted pages. `npm run format` formats supported project files. Generated page content comes from `scripts/build.py`, `scripts/templates/` and `data/`; edit these sources for changes that must survive a rebuild. JavaScript and CSS in `dist/assets/` are maintained directly. Vendor libraries remain in their original distribution format.

## Commit these

Commit `dist/`, `scripts/`, `data/`, `functions/` source, `tests/`, both package.json and package-lock.json files, hosting configuration, security rules, documentation, .gitignore, .prettierrc.json, .prettierignore and the included .vscode settings, extension recommendations and tasks. This project needs dist: it contains original images, CSS, JavaScript and ready-to-host pages, not just disposable build output.

## Never commit these

Do not commit node_modules, .env files, service-account or Admin SDK private-key JSON files, credentials, secrets, private certificates, local caches, logs, customer enquiry exports, customer photos, database backups or release ZIP files. Use the included ignore rules, but always inspect staged files because credentials can have any filename and customer exports may not match a pattern.

The browser app configuration is public client configuration, not an admin credential. Keep the required client configuration in the site. Keep service-account private keys and tokens out of GitHub. Access controls must protect the backend.

Before pushing, run `git status --short` and `git diff --cached --name-only`. Ignore rules do not remove files Git already tracks. If a private credential has already been committed, revoke or rotate it and remove it from repository history. Do not just delete the current copy.
