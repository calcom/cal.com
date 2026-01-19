import { describe, expect, it } from "vitest";

import { appDataSchema as databuddySchema } from "./databuddy/zod";
import { appDataSchema as fathomSchema } from "./fathom/zod";
import { appDataSchema as ga4Schema } from "./ga4/zod";
import { appDataSchema as gtmSchema } from "./gtm/zod";
import { appDataSchema as insihtsSchema } from "./insihts/zod";
import { appDataSchema as matomoSchema } from "./matomo/zod";
import { appDataSchema as metapixelSchema } from "./metapixel/zod";
import { appDataSchema as plausibleSchema } from "./plausible/zod";
import { appDataSchema as posthogSchema } from "./posthog/zod";
import { appDataSchema as twiplaSchema } from "./twipla/zod";
import { appDataSchema as umamiSchema } from "./umami/zod";

// Common XSS payloads that should be rejected by all schemas
const xssPayloads = [
  "';alert(1)//",
  '"><script>alert(1)</script>',
  "javascript:alert(1)",
  "<img src=x onerror=alert(1)>",
  "' onclick=alert(1) data-x='",
];

describe("Analytics Apps - Input Validation", () => {
  describe("GTM", () => {
    it("accepts valid GTM container IDs", () => {
      expect(gtmSchema.parse({ trackingId: "GTM-ABC123" }).trackingId).toBe("GTM-ABC123");
      expect(gtmSchema.parse({ trackingId: "abc123" }).trackingId).toBe("GTM-ABC123");
      expect(gtmSchema.parse({ trackingId: "gtm-xyz789" }).trackingId).toBe("GTM-XYZ789");
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => gtmSchema.parse({ trackingId: payload })).toThrow();
      }
    });
  });

  describe("GA4", () => {
    it("accepts valid GA4 measurement IDs", () => {
      expect(ga4Schema.parse({ trackingId: "G-ABC1234567" }).trackingId).toBe("G-ABC1234567");
      expect(ga4Schema.parse({ trackingId: "g-abc1234567" }).trackingId).toBe("G-ABC1234567");
      expect(ga4Schema.parse({ trackingId: "" }).trackingId).toBe("");
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => ga4Schema.parse({ trackingId: payload })).toThrow();
      }
    });
  });

  describe("Meta Pixel", () => {
    it("accepts valid pixel IDs (numeric)", () => {
      expect(metapixelSchema.parse({ trackingId: "1234567890123456" }).trackingId).toBe("1234567890123456");
      expect(metapixelSchema.parse({ trackingId: "" }).trackingId).toBe("");
    });

    it("rejects non-numeric values", () => {
      expect(() => metapixelSchema.parse({ trackingId: "abc123" })).toThrow();
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => metapixelSchema.parse({ trackingId: payload })).toThrow();
      }
    });
  });

  describe("PostHog", () => {
    it("accepts valid PostHog credentials", () => {
      const result = posthogSchema.parse({
        TRACKING_ID: "phc_abc123XYZ",
        API_HOST: "https://app.posthog.com",
      });
      expect(result.TRACKING_ID).toBe("phc_abc123XYZ");
      expect(result.API_HOST).toBe("https://app.posthog.com");
    });

    it("accepts legacy alphanumeric TRACKING_IDs", () => {
      expect(posthogSchema.parse({ TRACKING_ID: "legacy_key_123" }).TRACKING_ID).toBe("legacy_key_123");
    });

    it("rejects javascript: URLs", () => {
      expect(() => posthogSchema.parse({ API_HOST: "javascript:alert(1)" })).toThrow();
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => posthogSchema.parse({ TRACKING_ID: payload })).toThrow();
        expect(() => posthogSchema.parse({ API_HOST: payload })).toThrow();
      }
    });
  });

  describe("Fathom", () => {
    it("accepts valid site IDs", () => {
      expect(fathomSchema.parse({ trackingId: "ABCDEFG" }).trackingId).toBe("ABCDEFG");
      expect(fathomSchema.parse({ trackingId: "abcdefg" }).trackingId).toBe("ABCDEFG");
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => fathomSchema.parse({ trackingId: payload })).toThrow();
      }
    });
  });

  describe("Plausible", () => {
    it("accepts valid domain and URL", () => {
      const result = plausibleSchema.parse({
        trackingId: "example.com",
        PLAUSIBLE_URL: "https://plausible.io/js/script.js",
      });
      expect(result.trackingId).toBe("example.com");
      expect(result.PLAUSIBLE_URL).toBe("https://plausible.io/js/script.js");
    });

    it("accepts valid subdomains", () => {
      expect(plausibleSchema.parse({ trackingId: "sub.example.com" }).trackingId).toBe("sub.example.com");
      expect(plausibleSchema.parse({ trackingId: "deep.sub.example.com" }).trackingId).toBe(
        "deep.sub.example.com"
      );
    });

    it("accepts single-label domains", () => {
      expect(plausibleSchema.parse({ trackingId: "localhost" }).trackingId).toBe("localhost");
    });

    it("accepts domains with hyphens in labels", () => {
      expect(plausibleSchema.parse({ trackingId: "my-site.example.com" }).trackingId).toBe(
        "my-site.example.com"
      );
    });

    it("rejects consecutive dots", () => {
      expect(() => plausibleSchema.parse({ trackingId: "example..com" })).toThrow();
    });

    it("rejects hyphens at label boundaries", () => {
      expect(() => plausibleSchema.parse({ trackingId: "-example.com" })).toThrow();
      expect(() => plausibleSchema.parse({ trackingId: "example-.com" })).toThrow();
      expect(() => plausibleSchema.parse({ trackingId: "example.-com" })).toThrow();
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => plausibleSchema.parse({ trackingId: payload })).toThrow();
        expect(() => plausibleSchema.parse({ PLAUSIBLE_URL: payload })).toThrow();
      }
    });
  });

  describe("Matomo", () => {
    it("accepts valid URL and numeric site ID", () => {
      const result = matomoSchema.parse({
        MATOMO_URL: "https://matomo.example.com",
        SITE_ID: "42",
      });
      expect(result.MATOMO_URL).toBe("https://matomo.example.com");
      expect(result.SITE_ID).toBe("42");
    });

    it("rejects non-numeric SITE_ID", () => {
      expect(() => matomoSchema.parse({ SITE_ID: "abc" })).toThrow();
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => matomoSchema.parse({ MATOMO_URL: payload })).toThrow();
        expect(() => matomoSchema.parse({ SITE_ID: payload })).toThrow();
      }
    });
  });

  describe("Umami", () => {
    it("accepts UUID (v2) and URL", () => {
      const result = umamiSchema.parse({
        SITE_ID: "4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b",
        SCRIPT_URL: "https://umami.example.com/script.js",
      });
      expect(result.SITE_ID).toBe("4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b");
      expect(result.SCRIPT_URL).toBe("https://umami.example.com/script.js");
    });

    it("accepts numeric ID (v1)", () => {
      expect(umamiSchema.parse({ SITE_ID: "12345" }).SITE_ID).toBe("12345");
    });

    it("rejects invalid format", () => {
      expect(() => umamiSchema.parse({ SITE_ID: "not-a-valid-id!" })).toThrow();
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => umamiSchema.parse({ SITE_ID: payload })).toThrow();
        expect(() => umamiSchema.parse({ SCRIPT_URL: payload })).toThrow();
      }
    });
  });

  describe("Twipla", () => {
    it("accepts valid site IDs", () => {
      expect(twiplaSchema.parse({ SITE_ID: "abc123" }).SITE_ID).toBe("abc123");
      expect(twiplaSchema.parse({ SITE_ID: "4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b" }).SITE_ID).toBe(
        "4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b"
      );
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => twiplaSchema.parse({ SITE_ID: payload })).toThrow();
      }
    });
  });

  describe("Insihts", () => {
    it("accepts valid site ID and URL", () => {
      const result = insihtsSchema.parse({
        SITE_ID: "site_abc123",
        SCRIPT_URL: "https://collector.insihts.com/script.js",
      });
      expect(result.SITE_ID).toBe("site_abc123");
      expect(result.SCRIPT_URL).toBe("https://collector.insihts.com/script.js");
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => insihtsSchema.parse({ SITE_ID: payload })).toThrow();
        expect(() => insihtsSchema.parse({ SCRIPT_URL: payload })).toThrow();
      }
    });
  });

  describe("Databuddy", () => {
    it("accepts valid client ID and URLs", () => {
      const result = databuddySchema.parse({
        CLIENT_ID: "client_abc123",
        DATABUDDY_SCRIPT_URL: "https://cdn.databuddy.cc/databuddy.js",
        DATABUDDY_API_URL: "https://basket.databuddy.cc",
      });
      expect(result.CLIENT_ID).toBe("client_abc123");
      expect(result.DATABUDDY_SCRIPT_URL).toBe("https://cdn.databuddy.cc/databuddy.js");
      expect(result.DATABUDDY_API_URL).toBe("https://basket.databuddy.cc");
    });

    it("rejects XSS payloads", () => {
      for (const payload of xssPayloads) {
        expect(() => databuddySchema.parse({ CLIENT_ID: payload })).toThrow();
        expect(() => databuddySchema.parse({ DATABUDDY_SCRIPT_URL: payload })).toThrow();
        expect(() => databuddySchema.parse({ DATABUDDY_API_URL: payload })).toThrow();
      }
    });
  });
});
