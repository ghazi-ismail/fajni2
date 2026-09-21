import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  governorate: varchar("governorate", { length: 100 }).notNull(),
  area: varchar("area", { length: 140 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("customers_phone_unique").on(table.phone)]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  image: varchar("image", { length: 40 }).notNull().default("Gift"),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderStatuses = ["NEW", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull().references(() => customers.id),
  categoryId: int("categoryId").notNull().references(() => categories.id),
  budgetFils: int("budgetFils").notNull(),
  deliveryFils: int("deliveryFils").notNull().default(0),
  notes: text("notes"),
  status: mysqlEnum("status", orderStatuses).notNull().default("NEW"),
  salePriceFils: int("salePriceFils").notNull(),
  totalCostFils: int("totalCostFils").notNull().default(0),
  profitFils: int("profitFils").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("orders_customer_idx").on(table.customerId),
  index("orders_category_idx").on(table.categoryId),
  index("orders_status_idx").on(table.status),
]);

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitCostFils: int("unitCostFils").notNull(),
  totalCostFils: int("totalCostFils").notNull(),
});

export const orderCosts = mysqlTable("order_costs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  boxCostFils: int("boxCostFils").notNull().default(0),
  decorationCostFils: int("decorationCostFils").notNull().default(0),
  packagingCostFils: int("packagingCostFils").notNull().default(0),
  deliveryCostFils: int("deliveryCostFils").notNull().default(0),
  otherCostFils: int("otherCostFils").notNull().default(0),
}, table => [uniqueIndex("order_costs_order_unique").on(table.orderId)]);

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: mysqlEnum("fromStatus", orderStatuses),
  toStatus: mysqlEnum("toStatus", orderStatuses).notNull(),
  changedBy: varchar("changedBy", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orderNotes = mysqlTable("order_notes", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  author: varchar("author", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountFils: int("amountFils").notNull(),
  expenseDate: timestamp("expenseDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const warehouseProducts = mysqlTable("warehouse_products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
  quantity: int("quantity").notNull().default(0),
  unitCostFils: int("unitCostFils").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("settings_key_unique").on(table.key)]);

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 240 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("admins_email_unique").on(table.email)]);

export type Customer = typeof customers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
