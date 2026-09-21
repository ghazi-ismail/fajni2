import type { LucideIcon } from "lucide-react";
import { Baby, BookOpen, Camera, CarFront, Coffee, Dumbbell, Gamepad2, Gem, Gift, GraduationCap, Headphones, Heart, House, Leaf, Music, PawPrint, Plane, Shirt, Sparkles, Star, Trophy, WandSparkles } from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = { PawPrint, Sparkles, CarFront, House, Coffee, Gamepad2, GraduationCap, Dumbbell, Headphones, WandSparkles, Baby, Gem, Gift, Heart, Star, BookOpen, Shirt, Plane, Music, Camera, Leaf, Trophy };
export const categoryIconOptions = Object.keys(categoryIcons);

export function contrastText(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#211c35";
  const rgb = [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16) / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return luminance > 0.52 ? "#211c35" : "#ffffff";
}
export function mutedText(hex: string) {
  return contrastText(hex) === "#ffffff" ? "#ded9e8" : "#6f6981";
}
export const governorates = ["عمّان", "إربد", "الزرقاء", "البلقاء", "الكرك", "العقبة", "مادبا", "جرش", "عجلون", "المفرق", "الطفيلة", "معان"];

export const statusMeta = {
  NEW: { label: "طلب جديد", className: "status-new" },
  CONFIRMED: { label: "تم تأكيد الطلب", className: "status-confirmed" },
  OUT_FOR_DELIVERY: { label: "في التوصيل", className: "status-delivery" },
  DELIVERED: { label: "تم التسليم", className: "status-delivered" },
  CANCELLED: { label: "ملغي", className: "status-cancelled" },
} as const;

export type StatusKey = keyof typeof statusMeta;

export function formatJOD(fils = 0) {
  const amount = fils / 1000;
  return `${new Intl.NumberFormat("en-JO", { maximumFractionDigits: amount % 1 ? 3 : 0 }).format(amount)} د.أ`;
}

export function dateAr(value: Date | string | number) {
  return new Intl.DateTimeFormat("en-JO", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status as StatusKey] ?? statusMeta.NEW;
  return <span className={`status-badge ${meta.className}`}>{meta.label}</span>;
}

export function CategoryIcon({ name, className = "" }: { name: string; className?: string }) {
  const Icon = categoryIcons[name] ?? Gift;
  return <Icon className={className} strokeWidth={1.8} />;
}

export function userErrorMessage(error: { message?: string; data?: unknown }) {
  const message = error.message ?? "";
  const code = typeof error.data === "object" && error.data !== null && "code" in error.data ? String((error.data as { code?: string }).code ?? "") : "";
  if (message.includes("رقم الهاتف") || message.includes("كلمة المرور") || message.includes("لا يوجد حساب") || message.includes("الفئة") || message.includes("الميزانية") || message.includes("العنوان")) return message;
  if (message.includes("invalid_format") || message.includes("رقم الهاتف غير صالح")) return "رقم الهاتف غير صالح. استخدم أرقامًا فقط بطول 7 إلى 32 خانة.";
  if (message.includes("too_small") || message.includes("Too small")) return "بعض البيانات قصيرة جدًا. تأكد من كتابة العنوان بالتفصيل.";
  if (code === "UNAUTHORIZED") return "بيانات الدخول غير صحيحة أو انتهت الجلسة.";
  if (code === "BAD_REQUEST") return "راجع البيانات المدخلة وحاول مرة أخرى.";
  if (code === "NOT_FOUND") return "لم نتمكن من العثور على البيانات المطلوبة.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى، وإذا استمر الخطأ تواصل معنا.";
}
