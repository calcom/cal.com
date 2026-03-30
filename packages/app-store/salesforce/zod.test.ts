import { describe, it, expect } from "vitest";
import { appDataSchema } from "./zod";

describe("salesforce zod schemas", () => {
  it("validates appDataSchema with optional boolean field", () => {
    const result = appDataSchema.safeParse({
      enabled: true,
      roundRobinLeadSkip: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates appDataSchema with minimal data", () => {
    const result = appDataSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
  });
});
