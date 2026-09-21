import { describe, expect, it } from "vitest";
import { hashPassword } from "./routers";

describe("customer password authentication", () => {
  it("hashes the same password deterministically without storing it in plain text", () => {
    const hash = hashPassword("123456");
    expect(hash).toBe("1fbce75a27f8192c5d3783bd8b33c89b9bc8b1c58707c25f16e50f888800797a");
    expect(hash).not.toContain("123456");
  });
});
