import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";

import {
  extractHostTimezone,
  filterActiveLinks,
  isLinkExpired,
  isTimeBasedExpired,
  isUsageBasedExpired,
  validateHashedLinkData,
} from "./hashedLinksUtils";
import type { EventTypeForTimezone, HashedLinkData } from "./hashedLinksUtils";

describe("extractHostTimezone", () => {
  it("returns owner timezone for personal event type", () => {
    const eventType: EventTypeForTimezone = {
      userId: 1,
      owner: { timeZone: "America/New_York" },
    };
    expect(extractHostTimezone(eventType)).toBe("America/New_York");
  });

  it("returns first host timezone for team event type", () => {
    const eventType: EventTypeForTimezone = {
      teamId: 1,
      hosts: [{ user: { timeZone: "Europe/London" } }, { user: { timeZone: "Asia/Tokyo" } }],
    };
    expect(extractHostTimezone(eventType)).toBe("Europe/London");
  });

  it("returns team member timezone when no hosts available", () => {
    const eventType: EventTypeForTimezone = {
      teamId: 1,
      hosts: [],
      team: { members: [{ user: { timeZone: "Europe/Berlin" } }] },
    };
    expect(extractHostTimezone(eventType)).toBe("Europe/Berlin");
  });

  it("falls back to guessed timezone when no timezone info found", () => {
    const eventType: EventTypeForTimezone = {};
    const result = extractHostTimezone(eventType);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("falls back when userId but no owner timezone", () => {
    const eventType: EventTypeForTimezone = {
      userId: 1,
      owner: { timeZone: null },
    };
    const result = extractHostTimezone(eventType);
    expect(typeof result).toBe("string");
  });
});

describe("isUsageBasedExpired", () => {
  it("returns false when maxUsageCount is null", () => {
    expect(isUsageBasedExpired(5, null)).toBe(false);
  });

  it("returns false when maxUsageCount is undefined", () => {
    expect(isUsageBasedExpired(5)).toBe(false);
  });

  it("returns false when maxUsageCount is 0", () => {
    expect(isUsageBasedExpired(0, 0)).toBe(false);
  });

  it("returns false when maxUsageCount is negative", () => {
    expect(isUsageBasedExpired(0, -1)).toBe(false);
  });

  it("returns true when usageCount equals maxUsageCount", () => {
    expect(isUsageBasedExpired(5, 5)).toBe(true);
  });

  it("returns true when usageCount exceeds maxUsageCount", () => {
    expect(isUsageBasedExpired(10, 5)).toBe(true);
  });

  it("returns false when usageCount is below maxUsageCount", () => {
    expect(isUsageBasedExpired(3, 5)).toBe(false);
  });
});

describe("isTimeBasedExpired", () => {
  it("returns true when expiresAt is in the past", () => {
    const pastDate = new Date("2020-01-01T00:00:00Z");
    const eventType: EventTypeForTimezone = {};
    expect(isTimeBasedExpired(pastDate, eventType)).toBe(true);
  });

  it("returns false when expiresAt is in the future", () => {
    const futureDate = new Date("2099-01-01T00:00:00Z");
    const eventType: EventTypeForTimezone = {};
    expect(isTimeBasedExpired(futureDate, eventType)).toBe(false);
  });

  it("returns false when expiresAt is null", () => {
    const eventType: EventTypeForTimezone = {};
    expect(isTimeBasedExpired(null, eventType)).toBe(false);
  });
});

describe("validateHashedLinkData", () => {
  it("does not throw for valid link", () => {
    const linkData: HashedLinkData = {
      id: 1,
      expiresAt: new Date("2099-01-01"),
      maxUsageCount: 10,
      usageCount: 3,
      eventType: {},
    };
    expect(() => validateHashedLinkData(linkData)).not.toThrow();
  });

  it("throws PrivateLinkExpired when time-based expired", () => {
    const linkData: HashedLinkData = {
      id: 1,
      expiresAt: new Date("2020-01-01"),
      maxUsageCount: null,
      usageCount: 0,
      eventType: {},
    };
    expect(() => validateHashedLinkData(linkData)).toThrow(ErrorCode.PrivateLinkExpired);
  });

  it("throws PrivateLinkExpired when usage-based expired", () => {
    const linkData: HashedLinkData = {
      id: 1,
      expiresAt: null,
      maxUsageCount: 5,
      usageCount: 5,
      eventType: {},
    };
    expect(() => validateHashedLinkData(linkData)).toThrow(ErrorCode.PrivateLinkExpired);
  });

  it("does not throw when both expiresAt and maxUsageCount are null", () => {
    const linkData: HashedLinkData = {
      id: 1,
      expiresAt: null,
      maxUsageCount: null,
      usageCount: 0,
      eventType: {},
    };
    expect(() => validateHashedLinkData(linkData)).not.toThrow();
  });
});

describe("isLinkExpired", () => {
  it("returns true when expiresAt is in the past", () => {
    expect(isLinkExpired({ expiresAt: new Date("2020-01-01") })).toBe(true);
  });

  it("returns false when expiresAt is in the future", () => {
    expect(isLinkExpired({ expiresAt: new Date("2099-01-01") })).toBe(false);
  });

  it("falls back to usage-based when no expiresAt", () => {
    expect(isLinkExpired({ maxUsageCount: 5, usageCount: 5 })).toBe(true);
  });

  it("returns false when no expiration criteria", () => {
    expect(isLinkExpired({})).toBe(false);
  });

  it("uses timezone for time-based check", () => {
    expect(isLinkExpired({ expiresAt: new Date("2020-01-01") }, "America/New_York")).toBe(true);
  });
});

describe("filterActiveLinks", () => {
  it("filters out expired links", () => {
    const links = [
      { id: 1, expiresAt: new Date("2020-01-01"), maxUsageCount: null, usageCount: 0 },
      { id: 2, expiresAt: new Date("2099-01-01"), maxUsageCount: null, usageCount: 0 },
      { id: 3, expiresAt: null, maxUsageCount: 5, usageCount: 5 },
    ];
    const result = filterActiveLinks(links);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns all links when none are expired", () => {
    const links = [
      { id: 1, expiresAt: new Date("2099-01-01"), maxUsageCount: null, usageCount: 0 },
      { id: 2, expiresAt: null, maxUsageCount: null, usageCount: 0 },
    ];
    expect(filterActiveLinks(links)).toHaveLength(2);
  });

  it("returns empty array when all links expired", () => {
    const links = [
      { id: 1, expiresAt: new Date("2020-01-01"), maxUsageCount: null, usageCount: 0 },
    ];
    expect(filterActiveLinks(links)).toHaveLength(0);
  });

  it("handles empty array", () => {
    expect(filterActiveLinks([])).toEqual([]);
  });
});
