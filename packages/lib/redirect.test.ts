import { describe, expect, it } from "vitest";
import { Redirect } from "./redirect";

describe("Redirect", () => {
  it("stores 307 redirect code", () => {
    const r = new Redirect(307, "/target");
    expect(r.code).toBe(307);
  });

  it("stores 301 redirect code", () => {
    const r = new Redirect(301, "/permanent");
    expect(r.code).toBe(301);
  });

  it("stores URL", () => {
    const r = new Redirect(307, "https://example.com/page");
    expect(r.url).toBe("https://example.com/page");
  });

  it("is instanceof Redirect", () => {
    const r = new Redirect(307, "/test");
    expect(r).toBeInstanceOf(Redirect);
  });

  it("has readonly code and url properties", () => {
    const r = new Redirect(301, "/dest");
    expect(r.code).toBe(301);
    expect(r.url).toBe("/dest");
  });
});
