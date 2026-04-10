import { describe, expect, it } from "vitest";
import { extractBaseDomain, normalizeWebsiteUrl } from "../domain-normalization";

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
// extractBaseDomain
// ---------------------------------------------------------------------------
describe("extractBaseDomain", () => {
  describe("single-level TLDs", () => {
    it.each([
      ["acme.com", "acme", "acme.com"],
      ["example.nl", "example", "example.nl"],
      ["acme.io", "acme", "acme.io"],
      ["google.org", "google", "google.org"],
      ["example.net", "example", "example.net"],
      ["startup.dev", "startup", "startup.dev"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("multi-level TLDs", () => {
    it.each([
      ["acme.co.uk", "acme", "acme.co.uk"],
      ["acme.com.au", "acme", "acme.com.au"],
      ["acme.co.jp", "acme", "acme.co.jp"],
      ["acme.co.kr", "acme", "acme.co.kr"],
      ["acme.co.nz", "acme", "acme.co.nz"],
      ["acme.co.za", "acme", "acme.co.za"],
      ["acme.co.in", "acme", "acme.co.in"],
      ["acme.com.br", "acme", "acme.com.br"],
      ["acme.com.cn", "acme", "acme.com.cn"],
      ["acme.com.mx", "acme", "acme.com.mx"],
      ["acme.co.ke", "acme", "acme.co.ke"],
      ["acme.org.uk", "acme", "acme.org.uk"],
      ["acme.net.au", "acme", "acme.net.au"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("subdomains are stripped to registrable domain", () => {
    it.each([
      ["app.acme.com", "acme", "acme.com"],
      ["www.acme.com", "acme", "acme.com"],
      ["partners.acme.com", "acme", "acme.com"],
      ["sub.app.acme.co.uk", "acme", "acme.co.uk"],
      ["a.b.c.example.nl", "example", "example.nl"],
      ["blog.acme.com.au", "acme", "acme.com.au"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("normalizes full URLs first", () => {
    it.each([
      ["https://www.acme.com/about", "acme", "acme.com"],
      ["http://acme.co.uk:8080/en/", "acme", "acme.co.uk"],
      ["HTTPS://APP.EXAMPLE.COM", "example", "example.com"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("over-match prevention", () => {
    it("acme.com and macmedia.com have different base domains", () => {
      expect(extractBaseDomain("acme.com")?.baseDomain).toBe("acme");
      expect(extractBaseDomain("macmedia.com")?.baseDomain).toBe("macmedia");
    });

    it("acme.com and acme-corp.com have different base domains", () => {
      expect(extractBaseDomain("acme.com")?.baseDomain).toBe("acme");
      expect(extractBaseDomain("acme-corp.com")?.baseDomain).toBe("acme-corp");
    });

    it("acme.com and acme.co.uk share the same base domain", () => {
      expect(extractBaseDomain("acme.com")?.baseDomain).toBe(extractBaseDomain("acme.co.uk")?.baseDomain);
    });
  });

  describe("null returns for invalid inputs", () => {
    it.each([
      ["", "empty string"],
      ["   ", "whitespace"],
      ["192.168.1.1", "IPv4"],
      ["10.0.0.1", "IPv4"],
      ["https://192.168.1.1/admin", "IPv4 URL"],
      ["localhost", "localhost"],
      ["acme", "single label"],
    ])("returns null for %s (%s)", (input) => {
      expect(extractBaseDomain(input)).toBeNull();
    });

    it("returns null for null/undefined", () => {
      // @ts-expect-error -- testing runtime safety
      expect(extractBaseDomain(null)).toBeNull();
      // @ts-expect-error -- testing runtime safety
      expect(extractBaseDomain(undefined)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// extractBaseDomain — additional edge cases
// ---------------------------------------------------------------------------
describe("extractBaseDomain — additional edge cases", () => {
  describe("hyphenated domains", () => {
    it.each([
      ["my-company.com", "my-company", "my-company.com"],
      ["acme-corp.co.uk", "acme-corp", "acme-corp.co.uk"],
      ["super-long-name.com.au", "super-long-name", "super-long-name.com.au"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("numeric domains", () => {
    it.each([
      ["123.com", "123", "123.com"],
      ["365.co.uk", "365", "365.co.uk"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("domains with full URL decoration", () => {
    it.each([
      ["https://www.my-company.com:8080/about?ref=google#team", "my-company", "my-company.com"],
      ["HTTP://WWW.ACME.CO.UK/EN/ABOUT/", "acme", "acme.co.uk"],
    ])("%s → baseDomain=%s, registrable=%s", (input, baseDomain, registrableDomain) => {
      expect(extractBaseDomain(input)).toEqual({ baseDomain, registrableDomain });
    });
  });

  describe("cross-TLD equivalence", () => {
    it.each([
      [["acme.com", "acme.co.uk", "acme.io", "acme.com.au", "acme.de"], "acme"],
      [["example.com", "example.co.jp", "example.net", "example.org"], "example"],
      [["my-corp.com", "my-corp.co.uk", "my-corp.com.br"], "my-corp"],
    ])("all TLD variants of %s share baseDomain=%s", (domains, expectedBase) => {
      for (const domain of domains) {
        expect(extractBaseDomain(domain)?.baseDomain).toBe(expectedBase);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// performance benchmarks
// ---------------------------------------------------------------------------
describe("performance", () => {
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

  it("extracts 100 base domains in under 50ms", () => {
    const domains = Array.from({ length: 100 }, (_, i) => `company${i}.co.uk`);
    const start = performance.now();
    for (const domain of domains) {
      extractBaseDomain(domain);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("normalizes 1000 URLs in under 50ms", () => {
    const urls = Array.from(
      { length: 1000 },
      (_, i) => `https://www.company${i}.com:${8080 + (i % 10)}/about/page?ref=test&lang=en#section`
    );
    const start = performance.now();
    for (const url of urls) {
      normalizeWebsiteUrl(url);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("fuzzy in-memory filter: extractBaseDomain comparison on 100 candidates in under 100ms", () => {
    // Simulates the in-memory filtering step of fuzzyMatchAccountByDomain
    const targetBase = extractBaseDomain("acme.co.uk")!;
    const candidates = Array.from({ length: 100 }, (_, i) => ({
      Id: `acc-${i}`,
      Website: i % 10 === 0 ? `acme.com` : `company${i}.com`,
    }));

    const start = performance.now();
    const matches = candidates.filter((account) => {
      const accountBase = extractBaseDomain(account.Website);
      return accountBase?.baseDomain === targetBase.baseDomain;
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    // 10 out of 100 candidates should match (every 10th is "acme.com")
    expect(matches.length).toBe(10);
  });

  it("extractBaseDomain on 100 multi-level TLD domains in under 50ms", () => {
    const tlds = [".co.uk", ".com.au", ".co.jp", ".com.br", ".co.in"];
    const domains = Array.from({ length: 100 }, (_, i) => `company${i}${tlds[i % tlds.length]}`);
    const start = performance.now();
    for (const domain of domains) {
      extractBaseDomain(domain);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
