# Vercel Deployment Guide

## 1. Prepare the repository

Push the project root to GitHub, GitLab, or Bitbucket. The repository root is the directory that contains `package.json`, `client/`, `server/`, `drizzle/`, `api/`, and `vercel.json`.

## 2. Create the Vercel project

In Vercel, choose **Add New Project**, import the repository, and select the repository root as the Root Directory. Do not select only `client/`, because the API Function and Drizzle files are part of the same deployment.

Use these project settings:

- **Framework Preset:** Vite, or Other if Vercel detects the Express Function instead.
- **Install Command:** `pnpm install --frozen-lockfile`.
- **Build Command:** `pnpm build`.
- **Output Directory:** `dist/public`.
- **Node.js version:** use Node.js 20 or newer.

The repository's `vercel.json` already contains the build command, output directory, and SPA fallback. Vercel routes `/api/*` to `api/[...path].ts`, while non-API client routes fall back to `index.html`.

## 3. Add environment variables

Add the variables listed in `docs/VERCEL_ENVIRONMENT_VARIABLES.md`. At minimum, a working production deployment needs `DATABASE_URL` and `JWT_SECRET`. The OAuth variables are required for the Manus OAuth flow. Add the map, storage, and analytics variables only when those features are enabled.

Use separate values for Preview and Production when the providers expose separate environments. Never paste a production secret into the repository or a `VITE_` variable.

## 4. Prepare the database

Create or select a reachable MySQL-compatible database. Copy its connection string into the Vercel `DATABASE_URL` variable. The connection must accept connections from Vercel's Function runtime and must use TLS if required by the provider.

From a trusted local environment with the same `DATABASE_URL`, run:

```bash
pnpm install --frozen-lockfile
pnpm db:push
```

The existing script generates the Drizzle migration artifacts and applies the migrations. It is a one-time deployment step, not a request-time operation. If the database already contains the schema, inspect the generated migration plan before applying it.

## 5. Deploy

Create a Preview deployment first. Verify the build logs and then promote the tested commit to Production. Vercel will build the Vite client and compile the existing local server bundle, while the deployed API traffic is handled by the `api/[...path].ts` Function.

The application URL is the Vercel Production URL, for example:

```text
https://your-project.vercel.app
```

Both frontend and API use this same origin.

## 6. Test the deployment

Start with the health endpoint:

```bash
curl -i https://your-project.vercel.app/api/health
```

Expected response:

```json
{"ok":true}
```

Then open the root page and refresh these client routes directly:

- `/admin`
- `/admin/orders/1`
- `/account`
- `/create-order`

Check the browser Network panel for requests to `/api/trpc`. Verify customer login, admin login, logout, protected-route rejection without cookies, order creation, and database reads. OAuth must also be configured with the exact production callback:

```text
https://your-project.vercel.app/api/oauth/callback
```

Register that callback with the OAuth provider before testing the OAuth button.

## 7. Redeploy and migrate safely

For a code-only change, push a new commit and let Vercel create a deployment. For a schema change, review the Drizzle migration, apply it once to the target database, and then deploy the matching application commit. Do not put migration commands in an API handler or in a per-request initialization path.

## Troubleshooting

### API returns 404

Confirm that the project Root Directory is the repository root and that `api/[...path].ts` is present in the deployed commit. Confirm that the request path begins with `/api/`.

### SPA route refresh returns 404

Confirm that `vercel.json` is at the repository root and that the deployment is using `dist/public` as its output directory. The rewrite intentionally excludes `/api/*`.

### Database is unavailable

Check `DATABASE_URL`, provider network access, TLS requirements, and the database region. Run the Drizzle migration from a trusted environment and inspect Function logs for the actual connection error without exposing credentials.

### Authentication fails after deployment

Confirm `JWT_SECRET`, OAuth URLs, `VITE_APP_ID`, and the registered callback URL. Check that the request is HTTPS so secure cookies are accepted. Do not set an OAuth callback to a localhost URL for Production.

### Storage or maps fail

These paths depend on the existing Forge integration. Configure the server-side Forge variables for storage and the browser-exposed `VITE_FRONTEND_` variables for the map component. If the application does not use those features, leave their optional variables unset.

## References

[1]: https://vercel.com/kb/guide/ship-a-express-app-on-vercel "How to ship an Express app on Vercel"
[2]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"
[3]: https://vercel.com/docs/functions "Vercel Functions"

The deployment shape follows Vercel's current Express Function model.[1] The SPA rewrite follows Vercel's documented Vite guidance.[2] Function execution is request-driven and does not require a persistent server.[3]
