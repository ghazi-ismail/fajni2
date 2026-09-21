import type { OrderStatus } from "../drizzle/schema";

export type CostInput = {
  items: Array<{ quantity: number; unitCostFils: number }>;
  boxCostFils: number;
  decorationCostFils: number;
  packagingCostFils: number;
  deliveryCostFils: number;
  otherCostFils: number;
  salePriceFils: number;
};

export function computeOrderFinance(input: CostInput) {
  const productsCostFils = input.items.reduce((total, item) => total + item.quantity * item.unitCostFils, 0);
  const totalCostFils = productsCostFils + input.boxCostFils + input.decorationCostFils + input.packagingCostFils + input.deliveryCostFils + input.otherCostFils;
  return { productsCostFils, totalCostFils, profitFils: input.salePriceFils - totalCostFils };
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export const statusLabels: Record<OrderStatus, string> = {
  NEW: "طلب جديد",
  CONFIRMED: "تم تأكيد الطلب",
  OUT_FOR_DELIVERY: "في التوصيل",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};
