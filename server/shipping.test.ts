import { describe, expect, it } from "vitest";
import { getDeliveryFils } from "./routers";

describe("delivery rates", () => {
  it("converts the admin governorate rate from JOD to fils", () => {
    expect(getDeliveryFils(JSON.stringify({ "عمّان": "2", "العقبة": "5" }), "عمّان")).toBe(2000);
    expect(getDeliveryFils(JSON.stringify({ "عمّان": "2" }), "إربد")).toBe(0);
  });

  it("returns zero for malformed settings", () => {
    expect(getDeliveryFils("not-json", "عمّان")).toBe(0);
  });
});
