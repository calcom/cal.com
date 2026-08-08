import { isOriginAllowed } from "./is-origin-allowed";

describe("isOriginAllowed - conferencing OAuth redirect validation", () => {
  it("should allow redirect to exact configured origin", () => {
    const allowedOrigins = ["https://app.cal.com"];
    const onErrorReturnTo = "https://app.cal.com";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(true);
  });

  it("should block redirect to different domain", () => {
    const allowedOrigins = ["https://app.cal.com"];
    const onErrorReturnTo = "https://evil.com";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(false);
  });

  it("should block redirect to attacker-controlled domain", () => {
    const allowedOrigins = ["https://app.cal.com", "https://cal.com"];
    const onErrorReturnTo = "https://phishing-site.com/steal-credentials";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(false);
  });

  it("should allow redirect matching wildcard pattern for domain", () => {
    const allowedOrigins = ["https://*.cal.com/callback"];
    const onErrorReturnTo = "https://app.cal.com/callback";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(true);
  });

  it("should handle empty allowed origins", () => {
    const allowedOrigins: string[] = [];
    const onErrorReturnTo = "https://app.cal.com";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(false);
  });

  it("should allow exact match with full path", () => {
    const allowedOrigins = ["https://app.cal.com/booking/success"];
    const onErrorReturnTo = "https://app.cal.com/booking/success";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(true);
  });

  it("should allow redirect with wildcard domain pattern", () => {
    const allowedOrigins = ["https://*.cal.com"];
    const onErrorReturnTo = "https://app.cal.com";
    expect(isOriginAllowed(onErrorReturnTo, allowedOrigins)).toBe(true);
  });
});
