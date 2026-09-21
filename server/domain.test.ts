import { describe, expect, it } from "vitest";
import { computeOrderFinance, isValidStatusTransition } from "./domain";

describe("order finance", () => {
  it("calculates product cost, total cost, and profit in fils", () => {
    expect(computeOrderFinance({
      items: [{ quantity: 2, unitCostFils: 1750 }, { quantity: 1, unitCostFils: 500 }],
      boxCostFils: 300,
      decorationCostFils: 200,
      packagingCostFils: 150,
      deliveryCostFils: 250,
      otherCostFils: 100,
      salePriceFils: 6500,
    })).toEqual({ productsCostFils: 4000, totalCostFils: 5000, profitFils: 1500 });
  });

  it("keeps an empty product-cost row at zero", () => {
    expect(computeOrderFinance({ items: [{ quantity: 0, unitCostFils: 0 }], boxCostFils: 0, decorationCostFils: 0, packagingCostFils: 0, deliveryCostFils: 0, otherCostFils: 0, salePriceFils: 5000 })).toEqual({ productsCostFils: 0, totalCostFils: 0, profitFils: 5000 });
  });
});

describe("order status workflow", () => {
  it("allows only forward operational transitions", () => {
    expect(isValidStatusTransition("NEW", "CONFIRMED")).toBe(true);
    expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("CONFIRMED", "OUT_FOR_DELIVERY")).toBe(true);
    expect(isValidStatusTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
    expect(isValidStatusTransition("DELIVERED", "NEW")).toBe(false);
    expect(isValidStatusTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });
});
