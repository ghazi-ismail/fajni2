import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { parse } from "cookie";
import { createHash } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  admins,
  categories,
  customers,
  expenses,
  orderCosts,
  orderItems,
  orderNotes,
  orders,
  orderStatusHistory,
  orderStatuses,
  settings,
  warehouseProducts,
  type OrderStatus,
} from "../drizzle/schema";
import { computeOrderFinance, isValidStatusTransition } from "./domain";
import { getDashboardMetrics, getDb, getSettingsMap } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

const jwtSecret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "faj2ni-development-secret-change-me");
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required in production.");
}
const secret = new TextEncoder().encode(jwtSecret);
const adminCookieName = "faj2ni_admin";
const customerCookieName = "faj2ni_customer";
const fils = z.number().int().min(0).max(10_000_000);
const statusSchema = z.enum(orderStatuses);

export function hashPassword(password: string) {
  return createHash("sha256").update(`faj2ni:v1:${password}`).digest("hex");
}

export function getDeliveryFils(settingsValue: string | undefined, governorate: string) {
  try {
    const rates = JSON.parse(settingsValue || "{}") as Record<string, unknown>;
    return Math.max(0, Number(rates[governorate] || 0) * 1000);
  } catch {
    return 0;
  }
}

async function currentAdmin(cookieHeader?: string) {
  const token = parse(cookieHeader ?? "")[adminCookieName];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.adminId !== "number") return null;
    const db = await getDb();
    const rows = await db.select().from(admins).where(and(eq(admins.id, payload.adminId), eq(admins.active, true))).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getCustomerAccount(customerId: number) {
  const db = await getDb();
  const result = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!result[0]) return null;
  const customer = result[0];
  const customerOrders = await db.select({ order: orders, category: categories })
    .from(orders).innerJoin(categories, eq(orders.categoryId, categories.id))
    .where(eq(orders.customerId, customer.id)).orderBy(desc(orders.createdAt));
  const { passwordHash: _passwordHash, ...safeCustomer } = customer;
  return { customer: safeCustomer, orders: customerOrders.map(row => ({ ...row.order, categoryName: row.category.name })) };
}

async function currentCustomer(cookieHeader?: string) {
  const token = parse(cookieHeader ?? "")[customerCookieName];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.customerId !== "number") return null;
    return getCustomerAccount(payload.customerId);
  } catch {
    return null;
  }
}

const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const admin = await currentAdmin(ctx.req.headers.cookie);
  if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول إلى لوحة الإدارة." });
  return next({ ctx: { admin } });
});

const categoryInput = z.object({
  name: z.string().trim().min(2).max(120),
  image: z.string().trim().min(2).max(40),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  storefront: router({
    bootstrap: publicProcedure.query(async () => {
      const db = await getDb();
      const [categoryRows, values] = await Promise.all([
        db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder)),
        getSettingsMap(),
      ]);
      return { categories: categoryRows, settings: values };
    }),
  }),

  customer: router({
    me: publicProcedure.query(({ ctx }) => currentCustomer(ctx.req.headers.cookie)),
    login: publicProcedure.input(z.object({
      phone: z.string().trim().min(7).max(32),
      password: z.string().min(6).max(128),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const result = await db.select().from(customers).where(eq(customers.phone, input.phone)).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد حساب مرتبط بهذا الرقم بعد." });
      const customer = result[0];
      if (!customer.passwordHash || customer.passwordHash !== hashPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "رقم الهاتف أو كلمة المرور غير صحيحة." });
      }
      const token = await new SignJWT({ customerId: customer.id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret);
      ctx.res.cookie(customerCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
      return getCustomerAccount(customer.id);
    }),
    cancelOrder: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const session = await currentCustomer(ctx.req.headers.cookie);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول أولًا." });
      const db = await getDb();
      const order = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order[0] || order[0].customerId !== session.customer.id) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على الطلب." });
      if (order[0].status !== "NEW") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إلغاء الطلب بعد بدء تجهيزه." });
      await db.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, input.orderId));
      await db.insert(orderStatusHistory).values({ orderId: input.orderId, fromStatus: "NEW", toStatus: "CANCELLED", changedBy: "العميل" });
      void notifyOwner({ title: "إلغاء طلب جديد", content: `ألغى العميل ${session.customer.fullName} الطلب ${order[0].orderNumber}.` }).catch(error => console.warn("[Notification] Cancellation alert failed:", error));
      return { success: true } as const;
    }),
    orderDetail: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input, ctx }) => {
      const session = await currentCustomer(ctx.req.headers.cookie);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول أولًا." });
      const db = await getDb();
      const result = await db.select({ order: orders, category: categories }).from(orders).innerJoin(categories, eq(orders.categoryId, categories.id)).where(and(eq(orders.id, input.orderId), eq(orders.customerId, session.customer.id))).limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على الطلب." });
      const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, input.orderId)).orderBy(desc(orderStatusHistory.createdAt));
      return { ...result[0].order, categoryName: result[0].category.name, governorate: session.customer.governorate, address: session.customer.address, history };
    }),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(customerCookieName, { path: "/" }); return { success: true }; }),
  }),

  order: router({
    create: publicProcedure.input(z.object({
      categoryId: z.number().int().positive(),
      budgetFils: z.number().int().min(5000).max(10_000_000),
      notes: z.string().trim().max(1500).optional(),
      fullName: z.string().trim().min(2).max(160).optional(),
      phone: z.string().trim().regex(/^[0-9+\-\s]{7,32}$/, "رقم الهاتف غير صالح").optional(),
      password: z.string().min(6, "كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.").max(128).optional(),
      governorate: z.string().trim().min(2).max(100),
      area: z.string().trim().max(140).optional().default(""),
      address: z.string().trim().min(5).max(1200),
    })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const session = await currentCustomer(ctx.req.headers.cookie);
      const fullName = input.fullName?.trim() || session?.customer.fullName;
      const normalizedPhone = (input.phone || session?.customer.phone || "").replace(/[\s-]/g, "");
      const existingCustomer = await db.select({ passwordHash: customers.passwordHash }).from(customers).where(eq(customers.phone, normalizedPhone)).limit(1);
      const passwordHash = input.password ? hashPassword(input.password) : existingCustomer[0]?.passwordHash;
      if (!fullName || !normalizedPhone || !passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "يرجى اختيار العنوان أو تعبئة بيانات الحساب المطلوبة." });
      const category = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.active, true))).limit(1);
      if (!category[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "الفئة المختارة غير متاحة." });
      const settingRows = await db.select().from(settings).where(eq(settings.key, "shippingRates")).limit(1);
      const deliveryFils = getDeliveryFils(settingRows[0]?.value, input.governorate);
      const existingOrders = await db.select({ id: orders.id }).from(orders);
      await db.insert(customers).values({
        fullName,
        phone: normalizedPhone,
        passwordHash,
        governorate: input.governorate,
        area: input.area,
        address: input.address,
      }).onDuplicateKeyUpdate({ set: {
        fullName, passwordHash, governorate: input.governorate, area: input.area, address: input.address,
      } });
      const customer = await db.select().from(customers).where(eq(customers.phone, normalizedPhone)).limit(1);
      const inserted = await db.insert(orders).values({
        orderNumber: `FN-TEMP-${Date.now()}`,
        customerId: customer[0].id,
        categoryId: input.categoryId,
        budgetFils: input.budgetFils,
        deliveryFils,
        salePriceFils: input.budgetFils,
        notes: input.notes || null,
      });
      const orderId = Number(inserted[0].insertId);
      const orderNumber = `FN-${String(existingOrders.length + 1).padStart(6, "0")}`;
      await db.update(orders).set({ orderNumber }).where(eq(orders.id, orderId));
      await db.insert(orderStatusHistory).values({ orderId, fromStatus: null, toStatus: "NEW", changedBy: "النظام" });
      return { orderId, orderNumber, status: "NEW" as const };
    }),
  }),

  admin: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const admin = await currentAdmin(ctx.req.headers.cookie);
      return admin ? { id: admin.id, name: admin.name, email: admin.email } : null;
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().email(), password: z.string().min(6).max(128) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const result = await db.select().from(admins).where(and(eq(admins.email, input.email.toLowerCase()), eq(admins.active, true))).limit(1);
      const admin = result[0];
      if (!admin || admin.passwordHash !== hashPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة." });
      }
      const token = await new SignJWT({ adminId: admin.id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret);
      ctx.res.cookie(adminCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 12 * 60 * 60 * 1000, path: "/" });
      return { id: admin.id, name: admin.name, email: admin.email };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(adminCookieName, { path: "/" });
      return { success: true };
    }),

    dashboard: adminProcedure.query(() => getDashboardMetrics()),
    orders: adminProcedure.input(z.object({ status: statusSchema.optional() }).optional()).query(async ({ input }) => {
      const db = await getDb();
      const query = db.select({ order: orders, customer: customers, category: categories })
        .from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(categories, eq(orders.categoryId, categories.id));
      const rows = input?.status ? await query.where(eq(orders.status, input.status)).orderBy(desc(orders.createdAt)) : await query.orderBy(desc(orders.createdAt));
      return rows.map(row => ({ ...row.order, customerName: row.customer.fullName, phone: row.customer.phone, area: row.customer.area, categoryName: row.category.name }));
    }),
    orderDetail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      const base = await db.select({ order: orders, customer: customers, category: categories })
        .from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).innerJoin(categories, eq(orders.categoryId, categories.id))
        .where(eq(orders.id, input.id)).limit(1);
      if (!base[0]) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
      const [items, cost, history, notes] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, input.id)),
        db.select().from(orderCosts).where(eq(orderCosts.orderId, input.id)).limit(1),
        db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, input.id)).orderBy(desc(orderStatusHistory.createdAt)),
        db.select().from(orderNotes).where(eq(orderNotes.orderId, input.id)).orderBy(desc(orderNotes.createdAt)),
      ]);
      return { ...base[0].order, customer: base[0].customer, categoryName: base[0].category.name, items, costs: cost[0] ?? null, history, internalNotes: notes };
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: statusSchema })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const result = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      const order = result[0];
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
      if (!isValidStatusTransition(order.status as OrderStatus, input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تنفيذ هذا التغيير في حالة الطلب." });
      }
      await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id));
      await db.insert(orderStatusHistory).values({ orderId: input.id, fromStatus: order.status, toStatus: input.status, changedBy: ctx.admin.name });
      return { success: true };
    }),
    updateFinance: adminProcedure.input(z.object({
      id: z.number().int().positive(), salePriceFils: fils.min(5000), deliveryFils: fils, boxCostFils: fils, decorationCostFils: fils, packagingCostFils: fils, deliveryCostFils: fils, otherCostFils: fils,
      items: z.array(z.object({ name: z.string().trim().min(1).max(180), quantity: z.number().int().min(1).max(999), unitCostFils: fils })).max(30),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      const order = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!order[0]) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
      const finance = computeOrderFinance(input);
      await db.transaction(async tx => {
        await tx.delete(orderItems).where(eq(orderItems.orderId, input.id));
        if (input.items.length) await tx.insert(orderItems).values(input.items.map(item => ({ ...item, orderId: input.id, totalCostFils: item.quantity * item.unitCostFils })));
        await tx.insert(orderCosts).values({ orderId: input.id, boxCostFils: input.boxCostFils, decorationCostFils: input.decorationCostFils, packagingCostFils: input.packagingCostFils, deliveryCostFils: input.deliveryCostFils, otherCostFils: input.otherCostFils }).onDuplicateKeyUpdate({ set: { boxCostFils: input.boxCostFils, decorationCostFils: input.decorationCostFils, packagingCostFils: input.packagingCostFils, deliveryCostFils: input.deliveryCostFils, otherCostFils: input.otherCostFils } });
        await tx.update(orders).set({ salePriceFils: input.salePriceFils, deliveryFils: input.deliveryFils, totalCostFils: finance.totalCostFils, profitFils: finance.profitFils }).where(eq(orders.id, input.id));
      });
      return finance;
    }),
    addNote: adminProcedure.input(z.object({ id: z.number().int().positive(), body: z.string().trim().min(2).max(1500) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.insert(orderNotes).values({ orderId: input.id, body: input.body, author: ctx.admin.name });
      return { success: true };
    }),

    categories: adminProcedure.query(async () => (await getDb()).select().from(categories).orderBy(asc(categories.sortOrder))),
    saveCategory: adminProcedure.input(categoryInput.extend({ id: z.number().int().positive().optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...values } = input;
      if (id) { await db.update(categories).set(values).where(eq(categories.id, id)); return { id }; }
      const inserted = await db.insert(categories).values(values);
      return { id: Number(inserted[0].insertId) };
    }),
    deleteCategory: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getDb();
      const linked = await db.select({ id: orders.id }).from(orders).where(eq(orders.categoryId, input.id)).limit(1);
      if (linked[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حذف فئة مرتبطة بطلبات. يمكنك تعطيلها بدلًا من ذلك." });
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),

    settings: adminProcedure.query(() => getSettingsMap()),
    updateSettings: adminProcedure.input(z.object({ values: z.record(z.string().min(1).max(100), z.string().max(1500)) })).mutation(async ({ input }) => {
      const db = await getDb();
      for (const [key, value] of Object.entries(input.values)) {
        await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
      }
      return { success: true };
    }),

    expenses: adminProcedure.query(async () => (await getDb()).select().from(expenses).orderBy(desc(expenses.expenseDate))),
    saveExpense: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), amountFils: fils.min(1), expenseDate: z.coerce.date(), notes: z.string().trim().max(1000).optional() })).mutation(async ({ input }) => {
      const db = await getDb(); const { id, ...values } = input;
      if (id) { await db.update(expenses).set({ ...values, notes: values.notes || null }).where(eq(expenses.id, id)); return { id }; }
      const inserted = await db.insert(expenses).values({ ...values, notes: values.notes || null }); return { id: Number(inserted[0].insertId) };
    }),
    deleteExpense: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); await db.delete(expenses).where(eq(expenses.id, input.id)); return { success: true }; }),

    warehouse: adminProcedure.query(async () => { const db = await getDb(); const rows = await db.select({ product: warehouseProducts, category: categories }).from(warehouseProducts).leftJoin(categories, eq(warehouseProducts.categoryId, categories.id)).orderBy(asc(warehouseProducts.name)); return rows.map(row => ({ ...row.product, categoryName: row.category?.name ?? "غير مصنف" })); }),
    saveWarehouseProduct: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(180), categoryId: z.number().int().positive().nullable(), quantity: z.number().int().min(0).max(100_000), unitCostFils: fils })).mutation(async ({ input }) => {
      const db = await getDb(); const { id, ...values } = input;
      if (id) { await db.update(warehouseProducts).set(values).where(eq(warehouseProducts.id, id)); return { id }; }
      const inserted = await db.insert(warehouseProducts).values(values); return { id: Number(inserted[0].insertId) };
    }),
    deleteWarehouseProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); await db.delete(warehouseProducts).where(eq(warehouseProducts.id, input.id)); return { success: true }; }),
  }),
});

export type AppRouter = typeof appRouter;
