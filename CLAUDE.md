# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RedEmigra is a mentorship marketplace (mentors ↔ people emigrating) with bookings and payments. This `web/` folder is one part of a larger project rooted one level up (`redemigra-app/`), which also contains `sql/` (Postgres schema, run in Supabase's SQL editor), `supabase/functions/` (Deno Edge Functions for Stripe), and `tests/`. `web/` is the static frontend: **no build step, no framework, no package.json** — plain ES modules loaded directly by the browser via `<script type="module">`.

There is no git repository initialized here (`git init` has not been run in `redemigra-app/`). Do not assume git history is available.

Text and UI strings throughout the codebase are in **Spanish** (`es`) — match that when adding user-facing copy or comments in existing files.

## Running locally

From the `redemigra-app/` parent directory (not from `web/`):
```bash
python3 serve.py            # serves web/ at http://localhost:8080, rewrites app routes to app.html
python3 serve.py 3000       # optional port
```
There is no other dev server, linter, formatter, or test runner configured for the JS in `web/`. SQL logic has its own test harness in `../tests/` (`run_sql_tests.sh`, requires local Postgres) — unrelated to frontend work.

Before the app works at all, `web/js/config.js` needs real `SUPABASE_URL`/`SUPABASE_ANON_KEY` values (see `../SETUP.md`). Without them the app shows a "Falta conectar Supabase" setup screen instead of booting (`configured` check in `js/lib/core.js`).

## Two entry points

- `index.html` — static marketing landing page, self-contained, not part of the JS app.
- `app.html` — the actual platform shell (header/footer mounts, `#main`, `#toasts`), boots `js/main.js` as a module.

Hosting configs (`_redirects` for Netlify, `vercel.json` for Vercel) rewrite all non-asset paths to `app.html`, since routing is client-side.

## Architecture

Hand-rolled, dependency-free SPA (only external dep loaded via CDN in `app.html` is the Supabase JS client). Everything under `js/`:

- **`js/main.js`** — declares all routes and their access rules, then boots: checks Supabase config, restores session, loads catalog/profile data, wires `supabase.auth.onAuthStateChange`, starts the router.
- **`js/lib/router.js`** — minimal History API router. `route(pattern, loader, opts)` registers a path (supports `:param` segments); `opts.auth`/`opts.mentor`/`opts.admin` gate access and redirect to `/ingresar` or a fallback. Route loaders are lazy: `main.js` uses `page("file", "exportName")` to dynamically `import()` the page module only when its route is hit.
- **`js/lib/core.js`** — the shared kernel: Supabase client (`sb`), global reactive-ish `state` object (session/user/profile/mentor/isAdmin/countries/settings), the `html`/`raw`/`esc`/`mount` tagged-template system for **safe HTML injection** (auto-escapes interpolated values unless wrapped in `raw()`), inline SVG icon set (`ico()`), formatting helpers (money, dates in the user's timezone, slugify, avatars), the Spanish `ERR` code→message map and `errMsg()` for turning Supabase/Postgres error codes into user-facing text, `callFn()` for invoking Edge Functions with the user's JWT, and UI primitives (`toast`, `dialog`/`confirmDialog`, `busy()` for button loading states, `showFormError`).
- **`js/lib/session.js`** — loads/refreshes `state.profile`, `state.mentor`, `state.isAdmin`, unread message count, and the shared catalog (countries, platform settings).
- **`js/lib/layout.js`** — renders the header/footer chrome (nav changes based on `state`: guest vs traveler vs mentor vs admin).
- **`js/lib/slots.js`** — the day/time slot picker widget; always fetches availability via the `get_available_slots` Postgres RPC, which is the single source of truth for scheduling — never compute slot availability client-side.
- **`js/pages/*.js`** — one module per feature area (`auth`, `mentors`, `booking`, `account`, `chat`, `mentor` (mentor's own dashboard pages), `admin`, `legal`). Each exports named async functions matching a route's loader (e.g. `mentors.js` exports `list` and `profile`). A page function receives the router `ctx` (`{ root, params, path, query, go, onLeave, alive, set, title }`) and calls `ctx.set(html\`...\`)` to render, `ctx.title(...)` to set the tab title, `ctx.onLeave(fn)` to register cleanup (e.g. unsubscribe realtime channels) when navigating away.

### Conventions to follow when editing or adding pages

- Never build HTML via string concatenation — use the `html` tagged template from `core.js` so interpolated values are escaped by default. Only use `raw()` for trusted/pre-escaped fragments.
- Server-side data access goes through the Supabase client (`sb.from(...)`, `sb.rpc(...)`) directly from page modules for reads/simple writes, and through `callFn(name, body)` (in `core.js`) for anything requiring a secret key or server-side Stripe logic — those live in `../supabase/functions/`.
- Wrap Supabase/RPC errors with `errMsg(e)` before showing them to users; add new error codes to the `ERR` map in `core.js` rather than showing raw Postgres/Supabase messages.
- Route access control belongs in `main.js`'s `route(...)` opts (`auth`/`mentor`/`admin`), not ad-hoc checks inside page modules.
- Check `ctx.alive()` (or use `ctx.onLeave`) before mutating the DOM after an `await` in a page loader, since the router can navigate away mid-load.

## Payments and business logic

Booking, availability, pricing, cancellation/refund policy, and mentor payouts are implemented as Postgres functions/RLS in `../sql/` and Deno Edge Functions in `../supabase/functions/` (Stripe Checkout + Connect + webhooks) — the frontend calls these rather than reimplementing any of that logic. See `../SETUP.md` for the full list of Edge Functions, the Stripe Connect model (Express accounts), and which business rules (commission %, refund windows, etc.) are runtime-configurable via `platform_settings` vs. hardcoded.
