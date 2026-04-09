import { describe, expect, it } from "vitest";
import { normalizeWebsiteUrl } from "../domain-normalization";

// ---------------------------------------------------------------------------
// normalizeWebsiteUrl
// ---------------------------------------------------------------------------
describe("normalizeWebsiteUrl", () => {
  describe("protocol stripping", () => {
    it.each([
      ["https://acme.com", "acme.com"],
      ["http://acme.com", "acme.com"],
      ["HTTP://ACME.COM", "acme.com"],
      ["HTTPS://ACME.COM", "acme.com"],
      ["https://https://acme.com", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("www stripping", () => {
    it.each([
      ["https://www.acme.com", "acme.com"],
      ["www.acme.com", "acme.com"],
      ["http://www.acme.com", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("path stripping", () => {
    it.each([
      ["https://acme.com/about", "acme.com"],
      ["https://www.acme.com/en/about/", "acme.com"],
      ["acme.com/careers/engineering", "acme.com"],
      ["https://acme.com/", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("port stripping", () => {
    it.each([
      ["acme.com:443", "acme.com"],
      ["http://acme.com:8080/about", "acme.com"],
      ["acme.com:3000", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("query and fragment stripping", () => {
    it.each([
      ["https://acme.com?ref=google", "acme.com"],
      ["https://acme.com#section", "acme.com"],
      ["https://acme.com/page?a=1&b=2#top", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("case normalization", () => {
    it.each([
      ["ACME.COM", "acme.com"],
      ["Acme.Com", "acme.com"],
      ["HTTPS://WWW.ACME.COM/ABOUT", "acme.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("whitespace handling", () => {
    it.each([
      ["  acme.com  ", "acme.com"],
      [" https://acme.com ", "acme.com"],
      ["\tacme.com\n", "acme.com"],
    ])("trims %j → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });

  describe("trailing dot (DNS root)", () => {
    it("strips trailing dot", () => {
      expect(normalizeWebsiteUrl("acme.com.")).toBe("acme.com");
    });
  });

  describe("no-op for clean inputs", () => {
    it.each([["acme.com"], ["example.nl"], ["acme.co.uk"]])("%s stays %s", (input) => {
      expect(normalizeWebsiteUrl(input)).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("returns empty for empty string", () => {
      expect(normalizeWebsiteUrl("")).toBe("");
    });

    it("returns empty for whitespace-only", () => {
      expect(normalizeWebsiteUrl("   ")).toBe("");
    });

    it("returns empty for null-like values", () => {
      // @ts-expect-error -- testing runtime safety
      expect(normalizeWebsiteUrl(null)).toBe("");
      // @ts-expect-error -- testing runtime safety
      expect(normalizeWebsiteUrl(undefined)).toBe("");
    });

    it("handles IP address without modification", () => {
      expect(normalizeWebsiteUrl("https://192.168.1.1/admin")).toBe("192.168.1.1");
    });

    it("handles IP with port", () => {
      expect(normalizeWebsiteUrl("192.168.1.1:8080")).toBe("192.168.1.1");
    });

    it("handles localhost", () => {
      expect(normalizeWebsiteUrl("http://localhost:3000")).toBe("localhost");
    });
  });

  describe("complex real-world URLs", () => {
    it.each([
      ["https://www.example.com/en/about/", "example.com"],
      ["http://acme.com:443/en/about?lang=en#team", "acme.com"],
      ["HTTPS://WWW.ACME.IO/PRODUCTS/", "acme.io"],
      ["partners.acme.com/portal", "partners.acme.com"],
      ["https://app.example.com", "app.example.com"],
    ])("%s → %s", (input, expected) => {
      expect(normalizeWebsiteUrl(input)).toBe(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// performance
// ---------------------------------------------------------------------------
describe("normalizeWebsiteUrl performance", () => {
  it("normalizes 1 000 URLs in under 50 ms", () => {
    const urls = Array.from({ length: 1000 }, (_, i) => `https://www.company${i}.com/about?ref=test#section`);
    const start = performance.now();
    for (const url of urls) {
      normalizeWebsiteUrl(url);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("normalizes 10 000 URLs in under 200 ms", () => {
    const urls = Array.from(
      { length: 10000 },
      (_, i) => `HTTPS://WWW.COMPANY${i}.COM:8080/en/about/?lang=en&ref=test#top`
    );
    const start = performance.now();
    for (const url of urls) {
      normalizeWebsiteUrl(url);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
