# Repository Guidelines

## Project Structure & Module Organization
- **app.js**: Express entry point configuring middleware, API routing, and static delivery.
- **routes/api.js**: REST endpoints (`/api/check-time`, `/api/log-event`, `/api/session-init`).
- **lib/**: Shared helpers (SSRF defence, time measurement, identity hashing, SQLite repository).
- **db/**: SQLite schema (`schema.sql`) and initialisation script (`init.js`).
- **public/**: Frontend assets (`index.html`, `guide.html`, `privacy.html`, CSS/JS, robots/sitemap).
- **data/**: Runtime SQLite database (`app.db`). Treat as persistent volume in production.
- **Dockerfile / .env**: Deployment scaffold and environment defaults.

## Build, Test, and Development Commands
- `npm install`: Install dependencies (run after modifying package.json/lock).
- `npm run dev`: Start Express with nodemon for hot reload during local development.
- `npm start`: Launch the production server (`node app.js`).
- `npm run db:init`: Initialise or migrate the SQLite database by applying `schema.sql`.
- `node -e "require('./app')"`: Quick smoke check for syntax/runtime errors (used in CI snippets).

## Coding Style & Naming Conventions
- JavaScript is CommonJS (Node 20). Prefer async/await, const/let, and early returns.
- Indentation: 2 spaces; wrap lines at ~100 characters.
- HTML/CSS remain semantic and accessible (labels, aria attributes, prefers-reduced-motion).
- Use snake_case for JSON payload fields, camelCase for JS variables, kebab-case for CSS classes.

## Testing Guidelines
- No dedicated test suite yet; rely on manual API checks and `node -e "require('./app')"` to catch regressions.
- When adding tests, place them under `tests/` (create if absent) and expose a script (`npm test`) before merging.
- Verify `/api/check-time` against both reachable and blocked URLs; ensure SSRF safeguards respond with 4xx.

## Commit & Pull Request Guidelines
- Write imperative commit messages (`Add rate limit`, `Fix SSRF guard`) and group related changes per commit.
- Provide PR descriptions covering purpose, validation steps, and screenshots for UI tweaks.
- Reference relevant issues (`Fixes #123`) and note environment updates (e.g., new `.env` keys).

## Security & Configuration Tips
- Populate `.env` with production secrets (`IP_HASH_SALT`, AdSense IDs) and keep them out of version control.
- Behind a reverse proxy set `TRUST_PROXY=1`; otherwise leave blank to avoid rate-limit bypass.
- Mount `data/` to durable storage in Docker (`VOLUME /app/data`) and schedule SQLite backups.
