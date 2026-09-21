# Vercel Free-Tier Audit

## What runs on Vercel

The React/Vite static assets are served from Vercel's deployment output and CDN. The Express and tRPC API run as one Vercel Node.js Function through `api/[...path].ts`. The health endpoint, OAuth callback, tRPC routes, same-origin cookies, and SPA routing all use the same Vercel domain.

No persistent server, VPS, Render service, Railway service, WebSocket process, or scheduled worker was added. No new paid integration was introduced by the Vercel adaptation.

## What remains external

The application still requires a reachable PostgreSQL database because Drizzle persists the application's business data outside Vercel. A database provider is therefore required; the project is not Vercel-only. OAuth requires the existing OAuth service. The storage proxy requires the existing Forge/S3 service only if storage functionality is exercised. The map component requires its configured Forge map proxy when that UI is used. Analytics is optional.

## Free-tier considerations

Vercel Function usage is affected by invocation volume, active CPU, memory, execution duration, and request payload size. The application's 50 MB JSON parser limit is intentionally retained from the original project, but large requests can consume more Function resources and should be avoided on a free plan. Database queries and external OAuth, storage, notification, and map calls also consume time within the Function request.

The PostgreSQL provider has its own connection, storage, query, and bandwidth limits. Database pricing and free-tier terms are provider-specific and are not included in Vercel's allowance. Keep the database near the selected Function region to reduce latency.

The application has no cron or background worker path used by the business features. The repository contains a generic Manus heartbeat SDK, but it is not registered as a Vercel schedule by this implementation.

## What can cause unexpected usage

High-frequency client refetching, repeated failed authentication requests, large JSON bodies, expensive dashboard queries, unbounded order growth, and repeated external API calls can increase Function duration and database usage. Monitor Vercel Function logs and the database provider's usage dashboard after the first production deployment.

Do not assume that commercial usage is free. Confirm the current Vercel plan terms and the separate database, OAuth, Forge/S3, maps, and analytics terms before relying on the application for paid traffic.

## References

[1]: https://vercel.com/docs/functions "Vercel Functions"
[2]: https://vercel.com/kb/guide/ship-a-express-app-on-vercel "How to ship an Express app on Vercel"

Vercel describes Functions as request-driven and automatically scaled, with resource usage tied to runtime activity.[1] Its Express guidance describes the app as a single Function and notes the need to consider bundle and runtime behavior.[2]
