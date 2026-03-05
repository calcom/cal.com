import { describe, it, expect } from "vitest";

// biome-ignore lint/style/noRestrictedImports: test needs same type as source file
import type { BookerEventForAppData } from "@calcom/features/bookings/types.server";

import { getEventTypeAppData } from "./getEventTypeAppData";

const makeEventType = (overrides: Partial<BookerEventForAppData> = {}): BookerEventForAppData =>
  ({
    price: 0,
    currency: "usd",
    metadata: null,
    ...overrides,
  }) as BookerEventForAppData;

describe("getEventTypeAppData", () => {
  it("should return app data when present and enabled", () => {
    const eventType = makeEventType({
      metadata: {
        apps: {
          stripe: { enabled: true, price: 500, currency: "usd" },
        },
      },
    });
    const result = getEventTypeAppData(eventType, "stripe" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("enabled", true);
  });

  it("should return null when app metadata present but disabled", () => {
    const eventType = makeEventType({
      metadata: {
        apps: {
          stripe: { enabled: false, price: 500, currency: "usd" },
        },
      },
    });
    const result = getEventTypeAppData(eventType, "stripe" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeNull();
  });

  it("should override disabled when forcedGet is true", () => {
    const eventType = makeEventType({
      metadata: {
        apps: {
          stripe: { enabled: false, price: 500, currency: "usd" },
        },
      },
    });
    const result = getEventTypeAppData(
      eventType,
      "stripe" as Parameters<typeof getEventTypeAppData>[1],
      true
    );
    expect(result).toBeDefined();
    expect(result).toHaveProperty("enabled", false);
  });

  it("should favor eventType price/currency over appMetadata", () => {
    const eventType = makeEventType({
      price: 1000,
      currency: "eur",
      metadata: {
        apps: {
          stripe: { enabled: true, price: 500, currency: "usd" },
        },
      },
    });
    const result = getEventTypeAppData(eventType, "stripe" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeDefined();
    expect(result!.price).toBe(1000);
    expect(result!.currency).toBe("eur");
  });

  it("should handle TRACKING_ID fallback from trackingId", () => {
    const eventType = makeEventType({
      metadata: {
        apps: {
          ga4: { enabled: true, trackingId: "G-XXXX" },
        },
      },
    });
    const result = getEventTypeAppData(eventType, "ga4" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeDefined();
    expect(result!.TRACKING_ID).toBe("G-XXXX");
  });

  it("should return legacy stripe data when no app metadata", () => {
    const eventType = makeEventType({
      price: 500,
      currency: "usd",
      metadata: null,
    });
    const result = getEventTypeAppData(eventType, "stripe" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeDefined();
    expect(result!.price).toBe(500);
  });

  it("should return legacy giphy data when giphyThankYouPage set", () => {
    const eventType = makeEventType({
      metadata: {
        giphyThankYouPage: "https://giphy.com/thanks",
      },
    });
    const result = getEventTypeAppData(eventType, "giphy" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeDefined();
    expect(result!.thankYouPage).toBe("https://giphy.com/thanks");
  });

  it("should return null when no metadata and no legacy data", () => {
    const eventType = makeEventType({
      price: 0,
      currency: "usd",
      metadata: null,
    });
    // stripe legacy returns enabled: false when price is 0, so data isn't returned
    const result = getEventTypeAppData(eventType, "stripe" as Parameters<typeof getEventTypeAppData>[1]);
    expect(result).toBeNull();
  });
});
