import { isOriginAllowed } from "@/lib/is-origin-allowed/is-origin-allowed";

describe("isOriginAllowed", () => {
  describe("is allowed", () => {
    it("should return true for exact match without wildcard", () => {
      const allowedOrigins = ["https://app.cal.com/callback"];
      const origin = "https://app.cal.com/callback";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should return true for wildcard domain match", () => {
      const allowedOrigins = ["*.multiscreen.d1test.biz"];
      const origin = "https://sub.multiscreen.d1test.biz";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should return true for wildcard pattern matching any domain", () => {
      const allowedOrigins = ["*/callback"];
      const origin = "https://another.com/callback";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should handle a wildcard only pattern", () => {
      const allowedOrigins = ["*"];
      const origin = "https://any.domain.com/anypath";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should handle multiple allowed URIs where only one matches", () => {
      const allowedOrigins = [
        "https://app.cal.com/other",
        "*.notthisone.com",
        "https://app.cal.com/callback",
      ];
      const origin = "https://app.cal.com/callback";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should handle patterns with multiple wildcards correctly", () => {
      const allowedOrigins = ["https://*.mydomain.com/*"];
      const origin = "https://sub.mydomain.com/path/to/resource";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should handle patterns with wildcard for routes correctly", () => {
      const allowedOrigins = ["https://domain.com/*"];
      const origin = "https://domain.com/dashboard";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it("should handle patterns with wildcard for root route correctly", () => {
      const allowedOrigins = ["https://domain.com*"];
      const origin = "https://domain.com";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });
  });

  describe("is not allowed", () => {
    it("should return false if no allowed patterns match", () => {
      const allowedOrigins = ["https://app.cal.com/callback", "*.multiscreen.d1test.biz", "*/callback"];
      const origin = "https://unknown.com";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });

    it("should return false if wildcard pattern doesn't match the given origin", () => {
      const allowedOrigins = ["*.example.com"];
      const origin = "https://notexample.org";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });

    it("should handle empty allowedUris array correctly", () => {
      const allowedOrigins: string[] = [];
      const origin = "https://app.cal.com/callback";
      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });
  });
});
