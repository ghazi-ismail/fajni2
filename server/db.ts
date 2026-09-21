import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expenses, InsertUser, orders, settings, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _client = postgres(process.env.DATABASE_URL, {
      // Reuse one small client per warm Function instance and work with
      // transaction-pooling PostgreSQL providers such as serverless databases.
      max: 1,
      prepare: false,
    });
    _db = drizzle(_client);
  }
  if (!_db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      role: values.role,
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getSettingsMap() {
  const db = await getDb();
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}

export function startOfDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function getDashboardMetrics() {
  const db = await getDb();
  const [allOrders, allExpenses] = await Promise.all([
    db.select().from(orders),
    db.select().from(expenses),
  ]);
  const activeOrders = allOrders.filter(order => order.status !== "CANCELLED");
  const today = startOfDay();
  const month = startOfMonth();
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const revenue = sum(activeOrders.map(order => order.salePriceFils));
  const orderCosts = sum(activeOrders.map(order => order.totalCostFils));
  const totalExpenses = sum(allExpenses.map(expense => expense.amountFils));
  const todayRevenue = sum(activeOrders.filter(order => order.createdAt >= today).map(order => order.salePriceFils));
  const monthOrders = activeOrders.filter(order => order.createdAt >= month);
  const monthRevenue = sum(monthOrders.map(order => order.salePriceFils));
  const monthOrderCosts = sum(monthOrders.map(order => order.totalCostFils));
  const monthExpenses = sum(allExpenses.filter(expense => expense.expenseDate >= month).map(expense => expense.amountFils));
  const todayExpenses = sum(allExpenses.filter(expense => expense.expenseDate >= today).map(expense => expense.amountFils));
  return {
    counts: {
      total: allOrders.length,
      NEW: allOrders.filter(order => order.status === "NEW").length,
      CONFIRMED: allOrders.filter(order => order.status === "CONFIRMED").length,
      OUT_FOR_DELIVERY: allOrders.filter(order => order.status === "OUT_FOR_DELIVERY").length,
      DELIVERED: allOrders.filter(order => order.status === "DELIVERED").length,
      CANCELLED: allOrders.filter(order => order.status === "CANCELLED").length,
    },
    finance: {
      revenue,
      orderCosts,
      expenses: totalExpenses,
      netProfit: revenue - orderCosts - totalExpenses,
      todayRevenue,
      monthRevenue,
      monthExpenses,
      todayExpenses,
      monthNet: monthRevenue - monthOrderCosts - monthExpenses,
    },
  };
}
