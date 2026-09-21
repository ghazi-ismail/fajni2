CREATE TYPE "public"."order_status" AS ENUM('NEW', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(240) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"image" varchar(40) DEFAULT 'Gift' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"passwordHash" varchar(255),
	"governorate" varchar(100) NOT NULL,
	"area" varchar(140) NOT NULL,
	"address" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" varchar(80) NOT NULL,
	"amountFils" integer NOT NULL,
	"expenseDate" timestamp with time zone NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"boxCostFils" integer DEFAULT 0 NOT NULL,
	"decorationCostFils" integer DEFAULT 0 NOT NULL,
	"packagingCostFils" integer DEFAULT 0 NOT NULL,
	"deliveryCostFils" integer DEFAULT 0 NOT NULL,
	"otherCostFils" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitCostFils" integer NOT NULL,
	"totalCostFils" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"body" text NOT NULL,
	"author" varchar(160) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"fromStatus" "order_status",
	"toStatus" "order_status" NOT NULL,
	"changedBy" varchar(160) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" varchar(32) NOT NULL,
	"customerId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"budgetFils" integer NOT NULL,
	"deliveryFils" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"status" "order_status" DEFAULT 'NEW' NOT NULL,
	"salePriceFils" integer NOT NULL,
	"totalCostFils" integer DEFAULT 0 NOT NULL,
	"profitFils" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "warehouse_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"categoryId" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unitCostFils" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_costs" ADD CONSTRAINT "order_costs_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_products" ADD CONSTRAINT "warehouse_products_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_unique" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "order_costs_order_unique" ON "order_costs" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "orders_category_idx" ON "orders" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_unique" ON "settings" USING btree ("key");

--> statement-breakpoint
CREATE OR REPLACE FUNCTION faj2ni_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER warehouse_products_set_updated_at BEFORE UPDATE ON "warehouse_products" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON "settings" FOR EACH ROW EXECUTE FUNCTION faj2ni_set_updated_at();
