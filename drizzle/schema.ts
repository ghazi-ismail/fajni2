import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const orderStatuses = ["NEW", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const orderStatusEnum = pgEnum("order_status", orderStatuses);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  governorate: varchar("governorate", { length: 100 }).notNull(),
  area: varchar("area", { length: 140 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, table => [uniqueIndex("customers_phone_unique").on(table.phone)]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  image: varchar("image", { length: 40 }).notNull().default("Gift"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  customerId: integer("customerId").notNull().references(() => customers.id),
  categoryId: integer("categoryId").notNull().references(() => categories.id),
  budgetFils: integer("budgetFils").notNull(),
  deliveryFils: integer("deliveryFils").notNull().default(0),
  notes: text("notes"),
  status: orderStatusEnum("status").notNull().default("NEW"),
  salePriceFils: integer("salePriceFils").notNull(),
  totalCostFils: integer("totalCostFils").notNull().default(0),
  profitFils: integer("profitFils").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, table => [
  index("orders_customer_idx").on(table.customerId),
  index("orders_category_idx").on(table.categoryId),
  index("orders_status_idx").on(table.status),
]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitCostFils: integer("unitCostFils").notNull(),
  totalCostFils: integer("totalCostFils").notNull(),
});

export const orderCosts = pgTable("order_costs", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  boxCostFils: integer("boxCostFils").notNull().default(0),
  decorationCostFils: integer("decorationCostFils").notNull().default(0),
  packagingCostFils: integer("packagingCostFils").notNull().default(0),
  deliveryCostFils: integer("deliveryCostFils").notNull().default(0),
  otherCostFils: integer("otherCostFils").notNull().default(0),
}, table => [uniqueIndex("order_costs_order_unique").on(table.orderId)]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum("fromStatus"),
  toStatus: orderStatusEnum("toStatus").notNull(),
  changedBy: varchar("changedBy", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const orderNotes = pgTable("order_notes", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  author: varchar("author", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountFils: integer("amountFils").notNull(),
  expenseDate: timestamp("expenseDate", { withTimezone: true, mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const warehouseProducts = pgTable("warehouse_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  categoryId: integer("categoryId").references(() => categories.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(0),
  unitCostFils: integer("unitCostFils").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, table => [uniqueIndex("settings_key_unique").on(table.key)]);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 240 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, table => [uniqueIndex("admins_email_unique").on(table.email)]);

export type Customer = typeof customers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
