import { describe, expect, it } from "vitest";
import { Redirect } from "./redirect";

describe("Redirect", () => {
  it("constructs with 307 code and URL", () => {
    const redirect = new Redirect(307, "/new-url");
    expect(redirect.code).toBe(307);
    expect(redirect.url).toBe("/new-url");
  });

  it("constructs with 301 code and URL", () => {
    const redirect = new Redirect(301, "https://example.com");
    expect(redirect.code).toBe(301);
    expect(redirect.url).toBe("https://example.com");
  });

  it("has readonly code property", () => {
    const redirect = new Redirect(307, "/test");
    expect(redirect.code).toBe(307);
  });

  it("has readonly url property", () => {
    const redirect = new Redirect(301, "/permanent");
    expect(redirect.url).toBe("/permanent");
  });

  it("is instanceof Redirect", () => {
    const r = new Redirect(307, "/test");
    expect(r).toBeInstanceOf(Redirect);
  });
});
