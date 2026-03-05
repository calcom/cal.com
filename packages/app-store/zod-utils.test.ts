import { describe, it, expect } from "vitest";

import { EventTypeAppMetadataSchema, eventTypeMetaDataSchemaWithTypedApps } from "./zod-utils";

describe("EventTypeAppMetadataSchema", () => {
  it("should parse valid app metadata", () => {
    const result = EventTypeAppMetadataSchema.safeParse({
      stripe: { enabled: true, price: 100, currency: "usd" },
    });
    expect(result.success).toBe(true);
  });

  it("should accept partial/empty apps", () => {
    const result = EventTypeAppMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("eventTypeMetaDataSchemaWithTypedApps", () => {
  it("should accept null", () => {
    const result = eventTypeMetaDataSchemaWithTypedApps.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("should parse with apps field", () => {
    const result = eventTypeMetaDataSchemaWithTypedApps.safeParse({
      apps: {},
    });
    expect(result.success).toBe(true);
  });
});
