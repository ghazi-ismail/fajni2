# PostgreSQL Migration Guide

## Why the project was migrated

The project previously used MySQL through `mysql2` and Drizzle's MySQL adapter. The target deployment uses PostgreSQL on Vercel while keeping React/Vite, Express/tRPC, Drizzle, the existing API contracts, authentication, and business logic.

The migration is intentionally schema-preserving. It does not copy or delete production data. The new PostgreSQL database must be created separately and reviewed before application cutover.

## What changed

The Drizzle schema now uses `pgTable`, `pgEnum`, PostgreSQL `serial` identity columns, PostgreSQL `integer` columns for the existing integer-fils monetary values, and `timestamptz` columns mapped to JavaScript `Date` values. The two existing MySQL enums are PostgreSQL enums with the same values. Foreign keys, unique constraints, indexes, nullability, and delete behavior are preserved.

The database client is now `postgres` with `drizzle-orm/postgres-js`. It reuses one small client per warm Function instance, sets `max: 1`, and disables prepared statements for compatibility with transaction-pooling PostgreSQL providers. MySQL upserts are now PostgreSQL `onConflictDoUpdate` calls. MySQL `insertId` reads are now `returning({ id: ... })` reads.

Because PostgreSQL does not provide MySQL's `ON UPDATE CURRENT_TIMESTAMP` column modifier, the initial migration installs a small `faj2ni_set_updated_at` trigger function for the six tables that have `updatedAt` columns.

## What did not change

The frontend, routes, tRPC inputs and outputs, Express/Vercel Function boundary, OAuth flow, customer/admin authentication, cookie names, UI, status values, monetary calculations, seed content, and application-level date calculations remain unchanged.

## PostgreSQL setup

Create a new PostgreSQL database. Do not point these commands at the currently deployed production database and do not run them against the old MySQL database.

Set a local test variable or Vercel environment variable with a PostgreSQL URL:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME
```

The URL may include provider-specific SSL query parameters when required by the provider.

## Migration commands

Install dependencies and generate the migration:

```bash
pnpm install
pnpm db:generate
```

Review `drizzle/0000_wide_genesis.sql`, then apply it once to the new PostgreSQL database:

```bash
pnpm db:migrate
```

`pnpm db:push` is retained as a convenience wrapper for `db:generate` followed by `db:migrate`. Migration commands are never called from an HTTP request.

## Seed data

The existing seed script is PostgreSQL-compatible. Run it only when the new database is intentionally being populated with the existing demonstration data:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME pnpm exec tsx server/seed.ts
```

The seed script remains idempotent at the application level and does not run automatically during deployment.

## Local development

Create a local `.env` from `.env.example`, set `DATABASE_URL` to a local or test PostgreSQL database, and run:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

The local server continues to use `server/_core/index.ts`. Vercel continues to use `api/[...path].ts` and does not start a persistent server.

## Vercel setup

Configure the PostgreSQL `DATABASE_URL` in Vercel for Preview and Production as appropriate. Keep `JWT_SECRET`, OAuth variables, and other existing variables configured as documented in `docs/VERCEL_ENVIRONMENT_VARIABLES.md`.

The safe order for a new production database is:

1. Create the PostgreSQL database.
2. Apply `pnpm db:migrate` from a trusted environment using only the new database URL.
3. Optionally run the reviewed seed script.
4. Add the new `DATABASE_URL` to the intended Vercel environment.
5. Deploy a Preview.
6. Test health, public tRPC, customer login, admin login, order creation, and protected CRUD routes.
7. Promote the verified deployment when the owner is satisfied.

This task does not change existing Vercel Production variables and does not perform a live deployment.

## Production migration and data transfer

This branch creates a new PostgreSQL schema but does not migrate data from the existing MySQL production database. A separate, reviewed data-transfer plan is required if existing production records must be retained. That plan must export data, transform enum and timestamp values, load parent tables before child tables, reset sequences to the maximum imported IDs, validate row counts and relations, and rehearse on a copy before cutover. No destructive command is included here.

## Rollback considerations

Rollback is application-level: redeploy the prior MySQL-compatible commit and restore its original MySQL environment only if the prior database remains available. Do not attempt to run the PostgreSQL schema migration backward automatically. The PostgreSQL database is separate, so retaining the old database provides the safest rollback boundary.

## Known limitations

A real PostgreSQL connection test requires a separate test database. The migration branch must not use the production database. Vercel deployment, provider TLS behavior, OAuth exchange, and production cookie behavior require external credentials and were not executed in the archive-only environment.

## References

[1]: https://orm.drizzle.team/docs/get-started-postgresql "Drizzle PostgreSQL getting started"
[2]: https://orm.drizzle.team/docs/insert "Drizzle insert and conflict handling"
[3]: https://www.postgresql.org/docs/current/datatype-datetime.html "PostgreSQL date and time types"

The migration uses Drizzle's PostgreSQL adapter and conflict API.[1] [2] Timestamp choices use PostgreSQL's time-zone-aware type.[3]
