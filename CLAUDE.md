# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online booking system for a theme-park / picnic-island tourism company (university DESD group project). It serves five roles — `visitor`, `hotel_staff`, `ferry_staff`, `park_staff`, `admin` — across hotel, ferry, theme-park, payments, and promotions domains. The functional spec is in [context/requirements.md](context/requirements.md) and the authoritative data model is in [context/Db_Schema.md](context/Db_Schema.md).

## Monorepo layout

Turborepo + **npm workspaces** (`npm@11.12.1`, Node >= 18). Two apps and three packages:

- [apps/backend](apps/backend) — NestJS 11 API (port **4000**).
- [apps/frontend](apps/frontend) — TanStack Start SSR app (port **3000**).
- `packages/ui`, `packages/eslint-config`, `packages/typescript-config` — **leftovers from the `create-turbo` Next.js starter.** Neither app depends on `@repo/*`; each app carries its own `tsconfig`/eslint. `turbo.json`'s `.next/**` build outputs are also starter residue. Don't assume `@repo/ui` is the shared component library — it isn't wired in.

## Commands

Run from the repo root (Turborepo fans out to workspaces):

```sh
npm run dev          # all apps in watch mode
npm run build        # build all
npm run lint         # lint all (frontend has no lint script, so it's skipped)
npm run check-types  # tsc --noEmit across workspaces
npm run format       # prettier across the repo
```

Target one app with a filter: `turbo dev --filter=frontend`, `turbo build --filter=backend`.

### Backend (`cd apps/backend`)

```sh
npm run dev          # nest start --watch
npm test             # jest (unit, *.spec.ts under src)
npm test -- app.controller   # run a single test by name/path
npm run test:e2e     # jest with test/jest-e2e.json
npm run test:cov     # coverage
```

Database scripts (Drizzle ORM): `db:generate`, `db:push`, `db:migrate` (`tsx src/shared/database/migrate.ts`), `db:seed` (`tsx src/shared/database/seeds/seed.ts`). **Note:** these are declared but the data layer doesn't exist yet — `src/shared/database/` is unbuilt, Drizzle isn't in `dependencies`, and `.env` only sets `PORT`. The backend `src/` is still the Nest scaffold (`app.module/controller/service`). Adding the DB layer is the obvious next step.

### Frontend (`cd apps/frontend`)

```sh
npm run dev          # vite dev (port 3000)
npm run build        # vite build && tsc --noEmit
npm run preview      # preview production build
```

No test runner or lint script is configured for the frontend yet.

## Frontend architecture notes

- **TanStack Start + TanStack Router**, file-based routing under `src/routes/`. `src/routeTree.gen.ts` is **auto-generated** — never edit it by hand; it regenerates from route files on dev/build.
- `getRouter()` in [apps/frontend/src/router.tsx](apps/frontend/src/router.tsx) wires a per-request `QueryClient` into the router context and bridges TanStack Query with SSR via `setupRouterSsrQueryIntegration`. Use the query client from route context, not a global.
- Import alias `~/*` → `src/*` (see `tsconfig.json` paths + Vite `tsconfigPaths`).
- **shadcn/ui** (style `radix-nova`, base color `zinc`, lucide icons). Components live in `~/components/ui`, the `cn()` helper in `~/lib/utils`. Use the shadcn skill / `npx shadcn add` to add components. Tailwind v4 via `@tailwindcss/vite`; global styles in `~/styles/app.css`.
- HTTP client is **redaxios** (axios-compatible, lightweight).

## Data model & business rules (enforced in application code)

The DB can't express these — they must be checked in the backend service layer:

- **RBAC:** one role per user (`users.role_id`). Staff authority is scoped by `user_assignments` (role = what they can do, assignment = which hotels/routes/etc.). Fine-grained permission-per-role lives in app code, not the DB.
- **Cross-domain prerequisites:** a ferry booking requires a valid hotel booking (`ferry_bookings.hotel_booking_id`); an event booking requires a park ticket (`event_bookings.park_ticket_id`).
- **Availability:** room double-booking (no-overlap) checks and ferry/event capacity checks (sum `passenger_count`/`quantity` vs `capacity`) are application-enforced.
- **Money:** always `decimal(10,2)`, never floats. Bookings store a `total_amount` price snapshot at purchase time — reports/receipts reflect what was charged, not the current `base_price`.
- **Polymorphic patterns** recur: `images`/`imageables`, `payments` (`payable_type`/`payable_id`), `promotion_targets`, `user_assignments`, `audit_logs` (`subject_type`/`subject_id`). Advertisements are the one intentional exception (denormalized `image` URL).

When changing anything data-related, treat [context/Db_Schema.md](context/Db_Schema.md) as the source of truth and keep it in sync.
