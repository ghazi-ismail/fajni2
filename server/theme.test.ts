import { describe, expect, it } from "vitest";
import { contrastText } from "../client/src/lib/faj2ni";

describe("theme contrast", () => {
  it("uses dark text on light colors and white text on dark colors", () => {
    expect(contrastText("#ffffff")).toBe("#211c35");
    expect(contrastText("#211b35")).toBe("#ffffff");
  });
});
