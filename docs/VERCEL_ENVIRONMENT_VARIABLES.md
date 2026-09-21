# Vercel Environment Variables

Configure these variables in the Vercel project settings for the relevant environments. Do not commit production values. Variables beginning with `VITE_` are embedded in the browser bundle and must never contain server-only secrets.

| Variable | Required | Used by | Purpose | Production example format | Secret |
|---|---|---|---|---|---|
| `DATABASE_URL` | Yes | `server/db.ts`, `drizzle.config.ts` | PostgreSQL connection string for the application and migrations | `postgresql://user:password@host:5432/database` | Yes |
| `JWT_SECRET` | Yes | `server/routers.ts`, `server/_core/env.ts` | Signs customer/admin JWTs and the server session material | Long random value, at least 32 bytes | Yes |
| `VITE_APP_ID` | Yes for Manus OAuth | `server/_core/env.ts`, client OAuth flow | Application identifier sent to the OAuth service | Provider-issued app ID | No |
| `OAUTH_SERVER_URL` | Yes for Manus OAuth | `server/_core/sdk.ts` | Server-side OAuth API base URL | `https://oauth.example.com` | No |
| `VITE_OAUTH_PORTAL_URL` | Yes for Manus OAuth | `client/src/const.ts` | Browser OAuth authorization portal | `https://oauth.example.com` | No |
| `OWNER_OPEN_ID` | Optional | `server/db.ts` | Identifies the owner account that receives the admin role during OAuth upsert | Provider-issued user/open ID | No |
| `BUILT_IN_FORGE_API_URL` | Only if storage proxy is used | `server/_core/env.ts`, `server/_core/storageProxy.ts`, `server/storage.ts` | Server-side presign API base URL | `https://forge.example.com` | No |
| `BUILT_IN_FORGE_API_KEY` | Only if storage proxy is used | `server/_core/env.ts`, `server/_core/storageProxy.ts`, `server/storage.ts` | Server-side bearer key for storage presigning | Provider-issued server key | Yes |
| `VITE_FRONTEND_FORGE_API_URL` | Only if the map UI is used | `client/src/components/Map.tsx` | Browser map proxy base URL | `https://forge.example.com` | No |
| `VITE_FRONTEND_FORGE_API_KEY` | Only if the map UI is used | `client/src/components/Map.tsx` | Browser-usable map proxy key | Provider-issued public/browser key | No |
| `VITE_ANALYTICS_ENDPOINT` | Optional | `client/index.html` | Analytics script base URL | `https://analytics.example.com` | No |
| `VITE_ANALYTICS_WEBSITE_ID` | Optional | `client/index.html` | Analytics website identifier | Provider-issued website ID | No |
| `NODE_ENV` | Set by platform | `server/_core/index.ts`, cookies, Vite config | Selects development versus production behavior | `production` | No |
| `PORT` | Local only | `server/_core/index.ts` | Preferred local development port | `3000` | No |

## Vercel configuration notes

Set server-only values without the `VITE_` prefix as standard Environment Variables. Do not enable `BUILT_IN_FORGE_API_KEY` or `JWT_SECRET` for the browser. Vercel exposes `VITE_` values at build time, so changing them requires a new deployment.

`DATABASE_URL` must point to a reachable PostgreSQL provider. The repository does not contain a database server. Run the PostgreSQL migration once against that database before the first production test.

## Local setup

Copy this document's variable names from `.env.example` into a local `.env` file and provide development values. `.env` is ignored by Git. A production `.env` file must not be committed.

## References

[1]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"

Vercel documents that Vite variables intended for the browser use the `VITE_` prefix and are available during the build.[1]
