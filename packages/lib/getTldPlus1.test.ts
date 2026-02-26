import { describe, expect, it } from "vitest";
import { getTldPlus1 } from "./getTldPlus1";

describe("getTldPlus1", () => {
  it("returns TLD+1 from a subdomain hostname", () => {
    expect(getTldPlus1("app.cal.com")).toBe("cal.com");
  });

  it("returns hostname unchanged when already TLD+1", () => {
    expect(getTldPlus1("cal.com")).toBe("cal.com");
  });

  it("handles deeply nested subdomains", () => {
    expect(getTldPlus1("a.b.c.cal.com")).toBe("cal.com");
  });

  it("handles single part hostname", () => {
    expect(getTldPlus1("localhost")).toBe("localhost");
  });

  it("does NOT support multi-part TLDs like .co.uk (documented limitation)", () => {
    // This returns "co.uk" instead of "example.co.uk" — known limitation per JSDoc
    expect(getTldPlus1("app.example.co.uk")).toBe("co.uk");
  });

  it("handles empty string", () => {
    expect(getTldPlus1("")).toBe("");
  });
});
