import { eq } from "drizzle-orm";
import {
  admins, categories, customers, expenses, orderCosts, orderItems, orderNotes, orders, orderStatusHistory, settings, warehouseProducts,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword } from "./routers";

const categorySeed = [
  ["الحيوانات الأليفة", "PawPrint"], ["العناية الشخصية", "Sparkles"], ["السيارات", "CarFront"], ["المنزل", "House"],
  ["القهوة", "Coffee"], ["الألعاب", "Gamepad2"], ["التعليم", "GraduationCap"], ["الرياضة", "Dumbbell"],
  ["الإلكترونيات", "Headphones"], ["من إبداعك", "WandSparkles"], ["الأطفال", "Baby"], ["الإكسسوارات", "Gem"],
] as const;

async function seed() {
  const db = await getDb();
  const categoryCount = await db.select({ id: categories.id }).from(categories).limit(1);
  if (!categoryCount.length) {
    await db.insert(categories).values(categorySeed.map(([name, image], index) => ({ name, image, sortOrder: index + 1, active: true })));
  }
  const admin = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, "admin@faj2ni.jo")).limit(1);
  if (!admin.length) await db.insert(admins).values({ name: "مدير فاجئني", email: "admin@faj2ni.jo", passwordHash: hashPassword("Faj2ni2026") });
  const defaults: Record<string, string> = {
    homeTitle: "شو مخبّي الصندوق؟",
    homeDescription: "اختار الفئة، حدد ميزانيتك، وخلي علينا اختيار المفاجأة.",
    ctaText: "أنشئ طلبك",
    primaryColor: "#6C5CE7",
    secondaryColor: "#F2B5D4",
    backgroundColor: "#FCFBFF",
    borderRadius: "18",
    brandName: "فاجئني",
    budgets: "5000,10000,15000,20000,30000,50000,100000",
    shippingRates: JSON.stringify({ "عمّان": "2", "إربد": "2.5", "الزرقاء": "2.5", "البلقاء": "3", "الكرك": "4", "العقبة": "5", "مادبا": "3", "جرش": "3", "عجلون": "3.5", "المفرق": "4", "الطفيلة": "4.5", "معان": "5" }),
  };
  for (const [key, value] of Object.entries(defaults)) await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });

  const customerCount = await db.select({ id: customers.id }).from(customers).limit(1);
  if (!customerCount.length) {
    await db.insert(customers).values([
      { fullName: "ليان الخطيب", phone: "0791234567", passwordHash: hashPassword("123456"), governorate: "عمّان", area: "تلاع العلي", address: "شارع المدينة المنورة، بناية 24" },
      { fullName: "أحمد السالم", phone: "0787654321", passwordHash: hashPassword("123456"), governorate: "إربد", area: "الحصن", address: "الشارع الرئيسي، مقابل مدرسة الحصن" },
      { fullName: "سارة النجار", phone: "0775556666", passwordHash: hashPassword("123456"), governorate: "الزرقاء", area: "الجبل الأبيض", address: "شارع الجامعة، عمارة 8" },
    ]);
  }
  const orderCount = await db.select({ id: orders.id }).from(orders).limit(1);
  if (!orderCount.length) {
    const allCustomers = await db.select().from(customers);
    const allCategories = await db.select().from(categories);
    const findCategory = (name: string) => allCategories.find(category => category.name === name)!;
    const examples = [
      { number: "FN-000001", customer: allCustomers[0], category: findCategory("القهوة"), budget: 20000, status: "NEW" as const, notes: "لشخص يحب القهوة المختصة والنكهات الهادئة.", total: 0, profit: 20000 },
      { number: "FN-000002", customer: allCustomers[1], category: findCategory("السيارات"), budget: 30000, status: "CONFIRMED" as const, notes: "هدية لصديق يحب العناية بالسيارة.", total: 17800, profit: 12200 },
      { number: "FN-000003", customer: allCustomers[2], category: findCategory("العناية الشخصية"), budget: 15000, status: "OUT_FOR_DELIVERY" as const, notes: "ألوان هادئة ومناسبة لهدية تخرج.", total: 9800, profit: 5200 },
      { number: "FN-000004", customer: allCustomers[0], category: findCategory("الأطفال"), budget: 10000, status: "DELIVERED" as const, notes: "لعمر 6 سنوات، يفضل الأنشطة الإبداعية.", total: 6100, profit: 3900 },
      { number: "FN-000005", customer: allCustomers[1], category: findCategory("الإلكترونيات"), budget: 50000, status: "CANCELLED" as const, notes: "ألغاه العميل قبل التجهيز.", total: 0, profit: 0 },
    ];
    for (const item of examples) {
      const inserted = await db.insert(orders).values({ orderNumber: item.number, customerId: item.customer.id, categoryId: item.category.id, budgetFils: item.budget, salePriceFils: item.budget, status: item.status, notes: item.notes, totalCostFils: item.total, profitFils: item.profit }).returning({ id: orders.id });
      const orderId = inserted[0].id;
      await db.insert(orderStatusHistory).values({ orderId, fromStatus: null, toStatus: "NEW", changedBy: "النظام" });
      if (item.status !== "NEW") await db.insert(orderStatusHistory).values({ orderId, fromStatus: "NEW", toStatus: item.status, changedBy: "مدير فاجئني" });
      if (item.total) {
        const productBase = item.total - 1800;
        await db.insert(orderItems).values({ orderId, name: "منتج مختار للصندوق", quantity: 1, unitCostFils: productBase, totalCostFils: productBase });
        await db.insert(orderCosts).values({ orderId, boxCostFils: 600, decorationCostFils: 300, packagingCostFils: 300, deliveryCostFils: 600, otherCostFils: 0 });
      }
      if (item.status === "CONFIRMED") await db.insert(orderNotes).values({ orderId, body: "تم شراء المنتجات الأساسية وتجهيز البوكس.", author: "مدير فاجئني" });
    }
  }
  const expenseCount = await db.select({ id: expenses.id }).from(expenses).limit(1);
  if (!expenseCount.length) await db.insert(expenses).values([
    { name: "إعلان إنستغرام", category: "إعلانات", amountFils: 35000, expenseDate: new Date(), notes: "حملة إطلاق أولية" },
    { name: "مستلزمات تغليف", category: "تغليف", amountFils: 12000, expenseDate: new Date(), notes: "أشرطة وورق تغليف" },
    { name: "شحن داخلي", category: "شحن", amountFils: 8500, expenseDate: new Date(), notes: "توصيلات الأسبوع" },
  ]);
  const warehouseCount = await db.select({ id: warehouseProducts.id }).from(warehouseProducts).limit(1);
  if (!warehouseCount.length) await db.insert(warehouseProducts).values([
    { name: "بوكس كرتون متوسط", quantity: 36, unitCostFils: 600 },
    { name: "ورق تغليف كريمي", quantity: 72, unitCostFils: 150 },
    { name: "بطاقة إهداء", quantity: 120, unitCostFils: 80 },
    { name: "شريط ساتان", quantity: 44, unitCostFils: 120 },
  ]);
  console.log("Faj2ni demo data seeded.");
}

seed().catch(error => { console.error(error); process.exit(1); });
