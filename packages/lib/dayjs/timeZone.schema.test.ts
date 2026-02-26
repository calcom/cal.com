import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  isSupportedTimeZone: (tz: string) => {
    const valid = [
      "America/New_York",
      "UTC",
      "Europe/London",
      "Asia/Tokyo",
      "America/Los_Angeles",
      "Europe/Berlin",
    ];
    return valid.includes(tz);
  },
}));

import { timeZoneSchema } from "./timeZone.schema";

describe("timeZoneSchema", () => {
  it("accepts valid IANA timezone (America/New_York)", () => {
    const result = timeZoneSchema.safeParse("America/New_York");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("America/New_York");
    }
  });

  it("accepts UTC", () => {
    const result = timeZoneSchema.safeParse("UTC");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("UTC");
    }
  });

  it('transforms "+00:00" to "UTC"', () => {
    const result = timeZoneSchema.safeParse("+00:00");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("UTC");
    }
  });

  it("rejects invalid timezone string", () => {
    const result = timeZoneSchema.safeParse("Invalid/Timezone");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = timeZoneSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts Europe/London", () => {
    const result = timeZoneSchema.safeParse("Europe/London");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Europe/London");
    }
  });

  it("accepts Asia/Tokyo", () => {
    const result = timeZoneSchema.safeParse("Asia/Tokyo");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Asia/Tokyo");
    }
  });

  it("provides correct error message for invalid timezone", () => {
    const result = timeZoneSchema.safeParse("Not/Real");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid timezone. Must be a valid IANA timezone string.");
    }
  });
});
