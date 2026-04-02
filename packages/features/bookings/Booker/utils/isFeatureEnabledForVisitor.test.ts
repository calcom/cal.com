import { getCookie } from "@calcom/lib/cookie";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isVisitorWithinPercentage } from "./isFeatureEnabledForVisitor";

const generateRandomUuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const mockGetCookie = ({ expectedUid }: { expectedUid: string }) =>
  //@ts-expect-error - mock implementation
  getCookie.mockImplementation((name) => {
    if (name === "uid") {
      return expectedUid;
    }
    return null;
  });

vi.mock("@calcom/lib/cookie", () => ({
  getCookie: vi.fn(),
}));

describe("isVisitorWithinPercentage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test for deterministic behavior
  it("should provide consistent results for the same visitorId", () => {
    const testUuids = [
      "f956595b-0a69-4167-b9c9-a15d6ac445bb",
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    ];

    // For each UUID, check results are consistent across multiple calls
    testUuids.forEach((uuid) => {
      mockGetCookie({ expectedUid: uuid });
      const result1 = isVisitorWithinPercentage({ percentage: 50 });
      const result2 = isVisitorWithinPercentage({ percentage: 50 });
      const result3 = isVisitorWithinPercentage({ percentage: 50 });

      // All results should be the same for the same UUID
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  // Test for correct percentage distribution
  it("should approximately match the configured percentage", () => {
    // Generate a large number of random UUIDs to test distribution

    const sampleSize = 10000;
    const testPercentages = [10, 25, 50, 75, 90];

    testPercentages.forEach((percentage) => {
      let enabledCount = 0;

      // Run test with many random UUIDs
      for (let i = 0; i < sampleSize; i++) {
        const uuid = generateRandomUuid();
        mockGetCookie({ expectedUid: uuid });
        if (isVisitorWithinPercentage({ percentage })) {
          enabledCount++;
        }
      }

      // Calculate the actual percentage
      const actualPercentage = (enabledCount / sampleSize) * 100;
      // We allow a 3% margin of error given the sample size
      expect(actualPercentage).toBeGreaterThanOrEqual(percentage - 3);
      expect(actualPercentage).toBeLessThanOrEqual(percentage + 3);
    });
  });

  // Test for fallback to random behavior when no UUID is provided
  it("should not enable feature when UUID is not available unless the feature is 100% enabled", () => {
    mockGetCookie({ expectedUid: undefined });
    expect(isVisitorWithinPercentage({ percentage: 50 })).toBe(false);
    expect(isVisitorWithinPercentage({ percentage: 100 })).toBe(true);
  });

  it("should disable the feature when percentage is 0", () => {
    const uuids = Array.from({ length: 100 }, () => generateRandomUuid());
    uuids.forEach((uuid) => {
      mockGetCookie({ expectedUid: uuid });
      expect(isVisitorWithinPercentage({ percentage: 0 })).toBe(false);
    });
  });

  it("should enable the feature when percentage is 100", () => {
    const uuids = Array.from({ length: 100 }, () => generateRandomUuid());
    uuids.forEach((uuid) => {
      mockGetCookie({ expectedUid: uuid });
      expect(isVisitorWithinPercentage({ percentage: 100 })).toBe(true);
    });
  });
});
