# PostgreSQL Migration Audit

## Scope and safety

This audit covers the extracted `faj2ni` project before the PostgreSQL conversion. The archive did not contain Git metadata, so an isolated local repository was initialized on branch `migration/postgresql`. No production database connection was present in the environment, and no destructive database command was run.

The target architecture is **React/Vite + Express/tRPC + Drizzle ORM + PostgreSQL + Vercel Functions**. The migration keeps the API contracts, authentication behavior, UI, and business calculations unchanged.

## 1. Current database architecture

The current project uses `drizzle-orm/mysql2` with `mysql2` and `dialect: "mysql"` in `drizzle.config.ts`. `server/db.ts` lazily creates one Drizzle instance from `DATABASE_URL` and retains it in module scope. The schema is declared in `drizzle/schema.ts`. Existing migrations are MySQL SQL files under `drizzle/`.

The application stores all monetary values as integer fils rather than floating-point or decimal values. Settings that contain structured data, such as shipping rates, are stored as JSON text and parsed by application code. No JSON, decimal, binary, datetime, or raw SQL columns are present.

## 2. Tables and columns

| Table | Columns and current MySQL types |
|---|---|
| `users` | `id` int auto-increment primary key; `openId` varchar(64) not null; `name` text nullable; `email` varchar(320) nullable; `loginMethod` varchar(64) nullable; `role` enum(`user`,`admin`) not null default `user`; `createdAt`, `updatedAt`, `lastSignedIn` timestamp not null default current time |
| `customers` | `id` int auto-increment primary key; `fullName` varchar(160) not null; `phone` varchar(32) not null; `passwordHash` varchar(255) nullable; `governorate` varchar(100) not null; `area` varchar(140) not null; `address` text not null; `createdAt`, `updatedAt` timestamp not null default current time |
| `categories` | `id` int auto-increment primary key; `name` varchar(120) not null; `image` varchar(40) not null default `Gift`; `active` boolean not null default true; `sortOrder` int not null default 0; `createdAt`, `updatedAt` timestamp not null default current time |
| `orders` | `id` int auto-increment primary key; `orderNumber` varchar(32) not null; `customerId` int not null; `categoryId` int not null; `budgetFils`, `deliveryFils`, `salePriceFils`, `totalCostFils`, `profitFils` int not null; `notes` text nullable; `status` enum(`NEW`,`CONFIRMED`,`OUT_FOR_DELIVERY`,`DELIVERED`,`CANCELLED`) not null default `NEW`; `createdAt`, `updatedAt` timestamp not null default current time |
| `order_items` | `id` int auto-increment primary key; `orderId` int not null; `name` varchar(180) not null; `quantity`, `unitCostFils`, `totalCostFils` int not null; `quantity` defaults to 1 |
| `order_costs` | `id` int auto-increment primary key; `orderId` int not null; `boxCostFils`, `decorationCostFils`, `packagingCostFils`, `deliveryCostFils`, `otherCostFils` int not null default 0 |
| `order_status_history` | `id` int auto-increment primary key; `orderId` int not null; `fromStatus` nullable status enum; `toStatus` status enum not null; `changedBy` varchar(160) not null; `createdAt` timestamp not null default current time |
| `order_notes` | `id` int auto-increment primary key; `orderId` int not null; `body` text not null; `author` varchar(160) not null; `createdAt` timestamp not null default current time |
| `expenses` | `id` int auto-increment primary key; `name` varchar(160) not null; `category` varchar(80) not null; `amountFils` int not null; `expenseDate` timestamp not null; `notes` text nullable; `createdAt` timestamp not null default current time |
| `warehouse_products` | `id` int auto-increment primary key; `name` varchar(180) not null; `categoryId` int nullable; `quantity`, `unitCostFils` int not null; `quantity` and `unitCostFils` default 0; `createdAt`, `updatedAt` timestamp not null default current time |
| `settings` | `id` int auto-increment primary key; `key` varchar(100) not null; `value` text not null; `updatedAt` timestamp not null default current time |
| `admins` | `id` int auto-increment primary key; `name` varchar(120) not null; `email` varchar(240) not null; `passwordHash` varchar(255) not null; `active` boolean not null default true; `createdAt` timestamp not null default current time |

## 3. Indexes and constraints

The schema defines unique constraints on `users.openId`, `customers.phone`, `orders.orderNumber`, `settings.key`, and `admins.email`. `order_costs.orderId` also has a unique constraint because each order has at most one cost breakdown.

The following non-unique indexes exist on `orders.customerId`, `orders.categoryId`, and `orders.status`. The migration preserves all of them.

Foreign keys are `orders.customerId → customers.id`, `orders.categoryId → categories.id`, `order_items.orderId → orders.id`, `order_costs.orderId → orders.id`, `order_notes.orderId → orders.id`, `order_status_history.orderId → orders.id`, and `warehouse_products.categoryId → categories.id`. The order child tables use `ON DELETE CASCADE`. `orders` and `warehouse_products.categoryId` use the existing non-cascading and `SET NULL` behavior respectively.

## 4. Relations and application queries

The application uses explicit Drizzle joins rather than a generated relations API. `drizzle/relations.ts` is present but does not define application relations. Queries use `select`, `insert`, `update`, `delete`, `where`, `and`, `eq`, `asc`, `desc`, `innerJoin`, and `limit`. No transaction API or raw SQL query was found.

## 5. MySQL-specific code

The migration-specific MySQL elements are:

- `drizzle-orm/mysql2` and `mysql2`.
- `mysqlTable`, `mysqlEnum`, and MySQL column helpers in `drizzle/schema.ts`.
- `drizzle.config.ts` uses `dialect: "mysql"`.
- Existing SQL migrations use backtick identifiers, `AUTO_INCREMENT`, MySQL `enum`, `ON UPDATE CURRENT_TIMESTAMP`, and MySQL foreign-key syntax.
- `server/db.ts` uses `drizzle(process.env.DATABASE_URL)` from the MySQL adapter.
- `onDuplicateKeyUpdate` is used in the user upsert, settings seed, and customer upsert paths.
- MySQL insert results are read through `insertId` in the order creation and seed paths.

No `sql\`...\``, `INSERT IGNORE`, MySQL date function, JSON function, pool configuration, transaction, or raw SQL query was found.

## 6. PostgreSQL incompatibilities

PostgreSQL does not accept the existing MySQL migration files or MySQL schema builders. PostgreSQL uses `pgTable`, `pgEnum`, and PostgreSQL-specific column builders. MySQL `AUTO_INCREMENT` must become PostgreSQL identity/serial behavior. MySQL `enum` must become a named PostgreSQL enum. `ON UPDATE CURRENT_TIMESTAMP` is not a column modifier in PostgreSQL, so the migration must preserve `updatedAt` behavior with an explicit trigger. MySQL `ON DUPLICATE KEY UPDATE` must become Drizzle's PostgreSQL `onConflictDoUpdate`. MySQL's `insertId` result must become `RETURNING` and a returned row ID.

All current timestamp columns are mapped to PostgreSQL `timestamptz` with `Date` mode so that the application continues to compare JavaScript `Date` objects consistently in UTC-oriented serverless execution. Monetary integer-fils columns remain PostgreSQL `integer`; no precision is lost because no MySQL decimal column exists.

## 7. Exact files that require modification

- `drizzle/schema.ts`: PostgreSQL table builders, enums, integer identity columns, timestamps, indexes, and foreign keys.
- `drizzle.config.ts`: PostgreSQL dialect and credentials.
- `server/db.ts`: PostgreSQL Drizzle adapter and serverless-safe `postgres` client.
- `server/routers.ts`: PostgreSQL conflict clauses and returned insert IDs.
- `server/seed.ts`: PostgreSQL conflict clause and returned insert IDs.
- `package.json`: replace `mysql2` with `postgres` and update database scripts.
- `pnpm-lock.yaml`: regenerated dependency lockfile.
- `.env.example`: PostgreSQL `DATABASE_URL` format.
- `docs/VERCEL_ENVIRONMENT_VARIABLES.md`: PostgreSQL wording.
- `docs/VERCEL_DEPLOYMENT.md`: PostgreSQL setup and migration commands.
- `drizzle/`: replace the MySQL migration history with an initial PostgreSQL schema migration and corresponding metadata.

## 8. Exact files that should remain unchanged

The React/Vite client, `client/src` pages and components, shared tRPC types and constants, Express/Vercel Function routing, OAuth routes, cookie behavior, API router names and inputs, domain calculations, and UI styles should remain unchanged. The Vercel Function entrypoint added in the earlier deployment adaptation also remains unchanged.

## 9. Migration risks

The main risk is applying a PostgreSQL schema to a database containing MySQL data. This task does not connect to or alter the production database. The target PostgreSQL database must be created separately, and its migration must be applied only after review. Existing numeric IDs are kept as integer identity columns, but an actual data transfer would require explicit sequence synchronization and validation; no data transfer is attempted here.

A second risk is timestamp semantics. The conversion uses UTC-capable `timestamptz` columns and retains application-level `Date` values. A third risk is the loss of MySQL's automatic `updatedAt` behavior; this is addressed with a PostgreSQL trigger in the initial migration. A fourth risk is PostgreSQL connection behavior on Vercel; the selected `postgres` client is configured for a small reusable pool and `prepare: false` for transaction-pooler compatibility.

## 10. Planned implementation

1. Convert the schema manually, preserving names, nullability, defaults, constraints, indexes, and enum values.
2. Replace MySQL upsert and insert-ID code with PostgreSQL equivalents.
3. Replace the driver, database adapter, dialect, scripts, and environment documentation.
4. Generate and review a PostgreSQL initial migration. Add only the required `updatedAt` trigger statements.
5. Run typecheck, unit tests, build, migration generation, and a separate PostgreSQL integration verification when a non-production test URL is available.
6. Report any verification that cannot be run without a PostgreSQL test database as a blocker rather than claiming success.

## References

[1]: https://orm.drizzle.team/docs/get-started-postgresql "Drizzle PostgreSQL getting started"
[2]: https://orm.drizzle.team/docs/insert "Drizzle insert and conflict handling"
[3]: https://www.postgresql.org/docs/current/datatype-datetime.html "PostgreSQL date and time types"

The driver, schema, conflict, and timestamp decisions follow the Drizzle PostgreSQL and PostgreSQL documentation.[1] [2] [3]
