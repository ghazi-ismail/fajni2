# Vercel Runtime Fix Report

## Root cause

The repository state being deployed did not contain the dedicated serverless bundle pipeline described in the deployment notes. `api/[...path].ts` imported `createApp()` directly, while `pnpm build` produced the local `dist/index.js` server artifact rather than a Vercel-specific ESM Function bundle. The production site showed the resulting symptom: `/api/health` returned `FUNCTION_INVOCATION_FAILED`, while nested tRPC paths were not consistently routed to the Function.

The OAuth warning was not the crash root cause. OAuth client construction only logged a missing optional configuration; it did not throw. The startup dependency audit also found that database connections are lazy and that the storage proxy performs no network request during app construction.

A second startup risk was the module-level `JWT_SECRET` throw in `server/routers.ts`. That could terminate a Function before public routes were available when the secret was absent. JWT validation is now deferred to request time, so protected operations return an authorization error instead of crashing Function initialization.

## Fixes applied

`api/[...path].ts` now imports the generated `.vercel-api/api.mjs` ESM handler. `server/_core/vercel-entry.ts` provides the bundle entry and exports `createApp()` without opening a listening socket. The `build` script now creates `.vercel-api/api.mjs` with esbuild using `--platform=node --packages=external --bundle --format=esm`, while the existing Vite frontend build remains unchanged. `vercel.json` explicitly packages the generated bundle for the catch-all Function, and `.vercel-api/` is ignored as a build artifact.

OAuth route registration is conditional on `OAUTH_SERVER_URL`; public routes and public tRPC procedures remain available without OAuth configuration. JWT secret validation moved from import time to authentication time. No PostgreSQL, Neon, Drizzle, UI, business workflow, or database provider changes were made by this runtime fix.

## Verification

The following checks passed locally:

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test` — 5 files and 8 tests passed
- `pnpm build`
- `pnpm db:generate` — no schema changes
- `git diff --check`
- Generated `.vercel-api/api.mjs` imports successfully as ESM
- Bundle size: approximately 51.7 KB
- No `Dynamic require` or `require("path")` pattern in the generated bundle
- Exact bundled Function returned HTTP 200 for `/api/health`
- Exact bundled Function returned HTTP 200 for public `system.health` tRPC
- Exact bundled Function returned HTTP 200 for DB-backed `storefront.bootstrap` against an isolated local PostgreSQL database
- Protected `admin.dashboard` returned HTTP 401 without a session
- With OAuth, JWT, and database variables absent, health and public tRPC still returned successfully and protected tRPC returned HTTP 401

No production Neon database was accessed or modified.

## Production status

Before deployment, `https://fajni2.vercel.app/api/health` still returned `FUNCTION_INVOCATION_FAILED`, and the live nested tRPC path returned `NOT_FOUND`. The corrected code was verified locally but could not be deployed from this sandbox because the Vercel CLI is not installed and no authenticated Vercel project linkage is available here. The next deployment must use the repository containing these changes, then verify `/api/health`, `system.health`, and `storefront.bootstrap` against the connected Neon database.

## Required environment variables

The deployed application requires `DATABASE_URL` for database-backed procedures and `JWT_SECRET` for customer/admin JWT operations. OAuth login additionally requires `OAUTH_SERVER_URL` and the existing application OAuth variables. Storage and notification features require their existing `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` values when those features are used. No secret values are included in this report.
