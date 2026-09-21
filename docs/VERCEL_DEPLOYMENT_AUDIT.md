# Vercel Deployment Audit

## Conclusion

The project is a React 19 and Vite frontend backed by an Express 4 application, tRPC 11 routers, and Drizzle ORM over MySQL. The original application was designed to start a long-running Node process from `server/_core/index.ts`. That is appropriate for local development but is not the correct deployment boundary for a Vercel project that serves the frontend and API from one domain.

The minimum compatible change is to expose the existing Express application through `api/[...path].ts`, while keeping `server/_core/index.ts` for local development. The existing API contracts remain unchanged, including `/api/trpc/*` and `/api/oauth/callback`.

## 1. Current architecture

The repository is a single package. Vite builds the React client into `dist/public`. The server contains Express bootstrap code, OAuth routes, a storage proxy, tRPC context, routers, database helpers, and local development Vite middleware. The `shared` directory contains constants and types used by both sides.

## 2. Frontend framework

The frontend uses React 19, Vite 7, Tailwind CSS, Wouter, TanStack Query, and the tRPC React client. The API client already uses the same-origin URL `/api/trpc`, so production does not require a separate backend domain.

## 3. Backend framework

The backend uses Express 4 with `@trpc/server/adapters/express`. The original bootstrap created an HTTP server and called `server.listen()`. Vite was mounted in development, while static assets and an SPA fallback were mounted in production.

## 4. API architecture

The main API is tRPC under `/api/trpc`. OAuth uses `/api/oauth/callback`. The storage proxy uses `/manus-storage/*`. A new `/api/health` endpoint is provided for deployment checks. These routes are assembled by `server/_core/app.ts`, which does not open a listening socket.

## 5. Database and ORM

The application uses Drizzle ORM with the `mysql2` driver and a MySQL dialect. The schema is in `drizzle/schema.ts`, and SQL migrations are in `drizzle/`. The connection is created lazily from `DATABASE_URL` and cached for reuse within a warm function instance. No migration runs inside a request handler.

## 6. Authentication

There are three existing authentication paths. Manus OAuth uses an OAuth callback and the `app_session_id` cookie. Customer login uses a signed JWT in `faj2ni_customer`. Admin login uses a signed JWT in `faj2ni_admin`. Production JWT signing now fails fast when `JWT_SECRET` is missing instead of using a source-code fallback. Cookies are HTTP-only and scoped to `/`; production customer and admin cookies are secure.

## 7. Environment variables

The complete variable inventory is in `docs/VERCEL_ENVIRONMENT_VARIABLES.md`. Client-exposed variables are restricted to names beginning with `VITE_`. Database credentials, JWT signing material, and the server-side Forge key must be configured only as server-side Vercel variables.

## 8. Serverless compatibility

The application is compatible with Vercel Functions after the entrypoint separation. `api/[...path].ts` imports the Express app factory and exports it as the Function handler. No `listen`, port probing, or Vite middleware is loaded by the Function entrypoint. The local `npm run dev` flow still uses the original local bootstrap.

The database remains an external MySQL-compatible service. Vercel hosts the Function and static frontend, but it does not replace the current database engine. The storage proxy also depends on the existing Forge/S3 integration only when storage features are used.

## 9. Problems that prevented a correct Vercel deployment

The previous server entrypoint always created an HTTP server and called `server.listen()`. There was no Vercel Function entrypoint. The repository also lacked a Vercel configuration for the Vite SPA fallback. Production could therefore serve the initial page but fail to resolve deep links such as `/admin/orders/1` after a refresh. The source also contained a development JWT fallback that would have been unsafe in production.

## 10. Files that needed modification or addition

The implementation adds `server/_core/app.ts`, `api/[...path].ts`, `vercel.json`, `.env.example`, and the documentation under `docs/`. It modifies `server/_core/index.ts` to use the shared app factory and modifies `server/routers.ts` to require `JWT_SECRET` in production.

## 11. Files that do not need modification

The tRPC routers, Drizzle schema, SQL migrations, React pages, design system, and same-origin tRPC client do not need structural changes. `vite.config.ts` remains the source of the existing local Vite configuration. No new database engine, ORM, upload provider, or frontend framework was introduced.

## 12. Execution plan

1. Keep the existing Express, tRPC, Drizzle, MySQL, and React/Vite stack.
2. Extract request middleware and API routes into a socket-free application factory.
3. Export that factory through a Vercel catch-all API Function.
4. Keep the local server bootstrap for `npm run dev`.
5. Add only the SPA rewrite needed for client-side routes.
6. Document all environment variables and the required external MySQL/OAuth integrations.
7. Run dependency installation, typecheck, build, tests, and deployment-style health checks.

## References

[1]: https://vercel.com/kb/guide/ship-a-express-app-on-vercel "How to ship an Express app on Vercel"
[2]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"
[3]: https://vercel.com/docs/functions "Vercel Functions"

Vercel's current Express guidance describes an Express application as a single Function and supports exporting the application instance from an entrypoint.[1] Vercel's Vite guidance documents the SPA fallback rewrite used here.[2] The Function model is request-driven and does not require a persistent server process.[3]
