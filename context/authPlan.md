# Auth Layer Implementation Plan (NestJS + Drizzle/SQLite)

## Context

The requirements (`context/requirements.md`) need **role-based access control** across five roles (`visitor`, `hotel_staff`, `ferry_staff`, `park_staff`, `admin`), but the backend (`apps/backend`) is still the bare Nest scaffold (`app.module/controller/service`, `main.ts`) with **no auth and no data layer**. The Drizzle scripts in `package.json` (`db:generate/push/migrate/seed`) are wired but point at an unbuilt `src/shared/database/`.

We chose **native NestJS auth** (JWT + Passport + Guards) over an external provider — best fit for a "design the system" coursework deliverable and for owning the `users` table everything FKs to. DB engine: **SQLite (local dev)** via `drizzle-orm/better-sqlite3`. `roles`, `users`, `refresh_tokens` were already added to `context/Db_Schema.md`.

This plan delivers: the Drizzle data layer (auth tables + migrate + seed), typed config, a `UsersModule` (repository pattern), an `AuthModule` (register/login/refresh/logout/me), and global guards/pipes/throttling — all following the installed **nestjs-best-practices** skill.

## Locked decisions

- **Auth**: `@nestjs/jwt` + `@nestjs/passport` (`passport-jwt` strategy). Secrets from `@nestjs/config`, never hardcoded (`security-auth-jwt`).
- **DB**: SQLite via `drizzle-orm/better-sqlite3`, drizzle-kit dialect `sqlite`.
- **Hashing**: `bcrypt` (skill default; argon2 is a drop-in alt).
- **Tokens**: short-lived access JWT (**15m**) + opaque **refresh token** (random bytes, stored **hashed** in `refresh_tokens`, **rotated** on use, revoked on logout).
- **JWT payload is minimal**: `{ sub: userId, email, role }` — no password/sensitive fields.
- **Single role per user** (`users.role_id → roles`). Role slugs mirrored as a TS `enum` for the `@Roles()` decorator.
- **Global guards** via `APP_GUARD` (order matters): `ThrottlerGuard` → `JwtAuthGuard` (honors `@Public()`) → `RolesGuard` (reads `@Roles()`).
- **Global**: `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), `ClassSerializerInterceptor`, `helmet`, API prefix `api` + URI version `v1`.

## Dependencies to install (`apps/backend`)

- **Runtime**: `@nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/config @nestjs/throttler bcrypt class-validator class-transformer drizzle-orm better-sqlite3 joi helmet`
- **Dev**: `drizzle-kit @types/passport-jwt @types/bcrypt @types/better-sqlite3`

## Environment (`apps/backend/.env`) + Joi validation

```
PORT=4000
NODE_ENV=development
DATABASE_PATH=./data/dev.db
JWT_SECRET=<min 32 chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_ISSUER=booking-system
JWT_AUDIENCE=booking-system-clients
ADMIN_EMAIL=admin@example.com      # used by seed
ADMIN_PASSWORD=<seed-only>
```

`config/env.validation.ts` (Joi) enforces presence/shape and **`JWT_SECRET: Joi.string().min(32).required()`** (`devops-use-config-module`).

## Target folder structure (`apps/backend/`)

```
drizzle.config.ts                  # dialect 'sqlite', schema + migrations paths
.env
src/
├── main.ts                        # global pipes/interceptor/helmet/prefix/versioning/shutdown hooks
├── app.module.ts                  # ConfigModule(global+Joi), ThrottlerModule, DatabaseModule, UsersModule, AuthModule, APP_GUARDs
│
├── config/
│   ├── app.config.ts              # registerAs('app', ...)
│   ├── jwt.config.ts              # registerAs('jwt', ...)  secret/expiry/issuer/audience
│   ├── database.config.ts         # registerAs('database', ...)  sqlite path
│   └── env.validation.ts          # Joi schema
│
├── shared/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── roles.schema.ts
│   │   │   ├── users.schema.ts
│   │   │   ├── refresh-tokens.schema.ts
│   │   │   └── index.ts           # barrel: tables + relations
│   │   ├── drizzle.constants.ts   # DRIZZLE injection token
│   │   ├── database.provider.ts   # factory: better-sqlite3 → drizzle(client, { schema })
│   │   ├── database.module.ts     # @Global() module exporting DRIZZLE
│   │   ├── migrate.ts             # programmatic migrator (db:migrate target)
│   │   └── seeds/seed.ts          # seed 5 roles + initial admin (db:seed target)
│   ├── enums/role.enum.ts         # Role enum (slugs)
│   ├── decorators/
│   │   ├── public.decorator.ts    # @Public() -> SetMetadata('isPublic', true)
│   │   ├── roles.decorator.ts     # @Roles(...Role[])
│   │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      # extends AuthGuard('jwt'); skips when @Public()
│   │   └── roles.guard.ts         # reads @Roles(), checks req.user.role
│   └── filters/
│       └── all-exceptions.filter.ts   # consistent error envelope (optional but recommended)
│
├── users/
│   ├── dto/user-response.dto.ts   # @Exclude password_hash; @Expose safe fields
│   ├── users.repository.ts        # all Drizzle queries live here (arch-use-repository-pattern)
│   ├── users.service.ts           # business logic; throws Http exceptions
│   ├── users.controller.ts        # admin user mgmt (@Roles(Role.Admin)); minimal for now
│   └── users.module.ts            # exports UsersService (+ repo)
│
└── auth/
    ├── dto/{register.dto.ts, login.dto.ts, refresh-token.dto.ts}
    ├── interfaces/jwt-payload.interface.ts
    ├── strategies/jwt.strategy.ts # validate() re-checks user exists + is_active
    ├── auth.controller.ts         # register/login/refresh/logout/me
    ├── auth.service.ts            # hashing, token issue/rotate/revoke
    └── auth.module.ts             # JwtModule.registerAsync + PassportModule + UsersModule
```

## Component specs

### Drizzle schema (SQLite type mapping)
- PK: `integer('id').primaryKey({ autoIncrement: true })` (SQLite has no real `bigint`; rowid is 64-bit).
- Booleans (`is_active`): `integer({ mode: 'boolean' })`.
- Timestamps (`created_at`, `updated_at`, `email_verified_at`, `expires_at`, `revoked_at`): `integer({ mode: 'timestamp' })`, defaults via `sql\`(unixepoch())\``.
- `users.email`: `text` + **unique index**. `users.role_id`: FK → `roles.id`. `refresh_tokens.token_hash`: `text` unique; `user_id` FK with cascade delete.
- **Forward note (not auth):** future domain `decimal(10,2)` money columns will use Drizzle `text` mode (or integer cents) since SQLite lacks real decimals — out of scope here.

### `shared/database` (DatabaseModule + provider)
- `drizzle.constants.ts`: `export const DRIZZLE = Symbol('DRIZZLE')`.
- `database.provider.ts`: factory injecting `ConfigService`, opens `better-sqlite3(path)`, sets `PRAGMA foreign_keys = ON` + WAL, returns `drizzle(client, { schema })`.
- `database.module.ts`: `@Global()`, provides + exports `DRIZZLE`. Repositories `@Inject(DRIZZLE)` the typed db (`di-use-interfaces-tokens`).

### Decorators & guards (`security-use-guards`)
- `@Public()` = `SetMetadata('isPublic', true)`; `@Roles(...roles)` = `SetMetadata('roles', roles)`.
- `JwtAuthGuard extends AuthGuard('jwt')`: overrides `canActivate` to return `true` when `isPublic` (via `reflector.getAllAndOverride`), else delegates to passport.
- `RolesGuard`: reads required roles; `true` if none; else `requiredRoles.includes(request.user.role)` → `ForbiddenException` otherwise.
- `@CurrentUser()`: returns `request.user` (the sanitized object set by `JwtStrategy.validate`).

### `JwtStrategy` (`security-auth-jwt`)
- Config from `ConfigService` (`secret`, `issuer`, `audience`, `ignoreExpiration: false`).
- `validate(payload)`: load user via `UsersService.findById(payload.sub)`; throw `UnauthorizedException` if missing or `!is_active`; return `{ id, email, role }` (attached to `req.user`).

### `UsersModule` (repository pattern, `arch-use-repository-pattern` + `error-throw-http-exceptions`)
- `UsersRepository`: `findByEmail`, `findByIdWithRole` (joins `roles` for slug), `create`, `setActive`, `updateRole`. Sole owner of Drizzle queries. (better-sqlite3 is synchronous; methods expose `Promise` signatures for forward-compat.)
- `UsersService`: business rules; `create` throws `ConflictException` on duplicate email.
- `user-response.dto.ts`: `@Exclude()` on `password_hash`; serialized by global `ClassSerializerInterceptor` (`api-use-dto-serialization`).
- `UsersController` (`@Roles(Role.Admin)`): list / get / deactivate / change-role — minimal now, fleshed out later.

### `AuthModule`
- Imports `JwtModule.registerAsync` (factory from `ConfigService`), `PassportModule`, `UsersModule`; providers `AuthService`, `JwtStrategy`.
- `AuthService`:
  - `register(dto)` → ensure unique email, `bcrypt.hash`, create with default role `visitor`, issue tokens.
  - `login(dto)` → find by email, `bcrypt.compare` (generic `UnauthorizedException` on failure), check `is_active`, issue tokens.
  - `issueTokens(user)` → access JWT (`jwtService.sign`, minimal payload) + refresh (`randomBytes(32)`, store **bcrypt-hashed** with `expires_at`).
  - `refresh(dto)` → match presented token against stored non-revoked, unexpired hashes; rotate (revoke old, issue new).
  - `logout(userId)` → set `revoked_at` on active refresh tokens.
- `AuthController` endpoints (DTOs validated; throttled — `security-rate-limiting`):
  | Method | Path | Guard | Throttle |
  |---|---|---|---|
  | POST | `/api/v1/auth/register` | `@Public()` | tight |
  | POST | `/api/v1/auth/login` | `@Public()` | `5/min` |
  | POST | `/api/v1/auth/refresh` | `@Public()` | tight |
  | POST | `/api/v1/auth/logout` | authed | default |
  | GET | `/api/v1/auth/me` | authed | default |

### `main.ts` + `app.module.ts`
- `main.ts`: global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, `ClassSerializerInterceptor`, `helmet()`, `setGlobalPrefix('api')`, URI versioning (`v1`), `enableShutdownHooks()`.
- `app.module.ts`: `ConfigModule.forRoot({ isGlobal, load:[...], validationSchema })`, `ThrottlerModule.forRoot([...])`, `DatabaseModule`, `UsersModule`, `AuthModule`, and `APP_GUARD` providers in order: `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard`.

## How other (future) modules consume this
- Default: every route requires a valid JWT (global `JwtAuthGuard`). Mark open routes `@Public()` (promo banners, map, ads).
- Role gate: `@Roles(Role.HotelStaff, Role.Admin)` on controllers/handlers.
- Identity in handlers: `@CurrentUser() user`.
- **Per-entity scoping** (hotel manager → only their hotels) is a later `OwnershipGuard` that checks `user_assignments` — noted as a follow-up, not built here.

## Build order
1. Install dependencies.
2. `drizzle.config.ts` + `config/*` + `.env` + Joi schema.
3. `shared/database` schema + provider + module; `migrate.ts`; `seeds/seed.ts`.
4. `shared/enums`, `decorators`, `guards`, `filters`.
5. `UsersModule` (repository → service → controller → dto).
6. `AuthModule` (dto → interface → strategy → service → controller → module).
7. Wire `app.module.ts` + `main.ts`.
8. Generate + run migrations + seed; smoke-test endpoints.

## Verification (end-to-end)
1. `npm run db:generate` then `npm run db:migrate` → tables created in `./data/dev.db`.
2. `npm run db:seed` → 5 roles + admin user inserted (idempotent).
3. `turbo dev --filter=backend` (or `cd apps/backend && npm run dev`).
4. `curl` flow:
   - `POST /api/v1/auth/register` → `201` + access/refresh tokens; visitor role.
   - `POST /api/v1/auth/login` (admin seed creds) → `200` + tokens.
   - `GET /api/v1/auth/me` with `Authorization: Bearer <access>` → `200` user; **without** token → `401`.
   - Hit an `@Roles(Role.Admin)` route as a visitor → `403`; as admin → `200`.
   - `POST /api/v1/auth/refresh` → new token pair; reusing the old refresh token → `401` (rotation works).
   - `POST /api/v1/auth/logout` then refresh → `401`.
   - Exceed login attempts → `429` (throttler).
5. Tests (per `test-*` skill rules): unit `auth.service.spec.ts` with a mocked `UsersRepository`; e2e `auth.e2e-spec.ts` (supertest) covering register→login→me.

## Out of scope (follow-ups)
- Frontend wiring: token storage, redaxios `Authorization` interceptor, TanStack Router `beforeLoad` guards for `admin/` routes.
- Email verification + password-reset flows.
- `OwnershipGuard` over `user_assignments` for entity-scoped staff.
- Remaining domain Drizzle schemas (hotel/ferry/park/payments/promotions).
- Optional hardening: refresh token in httpOnly cookie; `password_changed_at` to invalidate old JWTs.
