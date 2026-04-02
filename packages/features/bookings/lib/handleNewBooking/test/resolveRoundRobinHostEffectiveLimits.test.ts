import { describe, expect, it } from "vitest";

import { PeriodType, SchedulingType } from "@calcom/prisma/enums";

import {
  buildEffectiveHostLimitsProfileKey,
  getRoundRobinHostLimitOverrides,
  groupRoundRobinHostsByEffectiveLimits,
  hasAnyRoundRobinHostOverrides,
  resolveRoundRobinHostEffectiveLimits,
  type RoundRobinHostLimitOverrides,
} from "../resolveRoundRobinHostEffectiveLimits";

const baseEventLimits = {
  minimumBookingNotice: 120,
  beforeEventBuffer: 10,
  afterEventBuffer: 15,
  slotInterval: 30,
  bookingLimits: { PER_DAY: 5 },
  durationLimits: { PER_DAY: 180 },
  periodType: PeriodType.ROLLING,
  periodDays: 30,
  periodCountCalendarDays: true,
  periodStartDate: null,
  periodEndDate: null,
};

describe("resolveRoundRobinHostEffectiveLimits", () => {
  it("uses event-level limits when no overrides are provided", () => {
    const resolved = resolveRoundRobinHostEffectiveLimits({
      schedulingType: SchedulingType.ROUND_ROBIN,
      eventLimits: baseEventLimits,
    });

    expect(resolved).toEqual(baseEventLimits);
  });

  it("ignores overrides for non-round-robin scheduling", () => {
    const resolved = resolveRoundRobinHostEffectiveLimits({
      schedulingType: SchedulingType.COLLECTIVE,
      eventLimits: baseEventLimits,
      hostOverrides: {
        minimumBookingNotice: 20,
        beforeEventBuffer: 0,
        slotInterval: 15,
      },
    });

    expect(resolved).toEqual(baseEventLimits);
  });

  it("applies host overrides for round-robin hosts", () => {
    const resolved = resolveRoundRobinHostEffectiveLimits({
      schedulingType: SchedulingType.ROUND_ROBIN,
      eventLimits: baseEventLimits,
      hostOverrides: {
        minimumBookingNotice: 45,
        beforeEventBuffer: 5,
        afterEventBuffer: 5,
        slotInterval: 20,
        bookingLimits: { PER_DAY: 2 },
        durationLimits: { PER_DAY: 60 },
        periodType: PeriodType.RANGE,
        periodDays: 10,
        periodCountCalendarDays: false,
        periodStartDate: new Date("2026-01-01T00:00:00.000Z"),
        periodEndDate: new Date("2026-01-31T00:00:00.000Z"),
      },
    });

    expect(resolved.minimumBookingNotice).toBe(45);
    expect(resolved.beforeEventBuffer).toBe(5);
    expect(resolved.afterEventBuffer).toBe(5);
    expect(resolved.slotInterval).toBe(20);
    expect(resolved.bookingLimits).toEqual({ PER_DAY: 2 });
    expect(resolved.durationLimits).toEqual({ PER_DAY: 60 });
    expect(resolved.periodType).toBe(PeriodType.RANGE);
    expect(resolved.periodDays).toBe(10);
    expect(resolved.periodCountCalendarDays).toBe(false);
    expect(resolved.periodStartDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(resolved.periodEndDate).toEqual(new Date("2026-01-31T00:00:00.000Z"));
  });

  it("falls back to event-level value when override field is null", () => {
    const resolved = resolveRoundRobinHostEffectiveLimits({
      schedulingType: SchedulingType.ROUND_ROBIN,
      eventLimits: baseEventLimits,
      hostOverrides: {
        minimumBookingNotice: null,
        beforeEventBuffer: null,
        slotInterval: null,
      },
    });

    expect(resolved.minimumBookingNotice).toBe(baseEventLimits.minimumBookingNotice);
    expect(resolved.beforeEventBuffer).toBe(baseEventLimits.beforeEventBuffer);
    expect(resolved.slotInterval).toBe(baseEventLimits.slotInterval);
  });
});

describe("hasAnyRoundRobinHostOverrides", () => {
  it("returns false for missing overrides", () => {
    expect(hasAnyRoundRobinHostOverrides()).toBe(false);
    expect(hasAnyRoundRobinHostOverrides(null)).toBe(false);
  });

  it("returns false when all override values are null/undefined", () => {
    const overrides: RoundRobinHostLimitOverrides = {
      minimumBookingNotice: null,
      beforeEventBuffer: undefined,
      slotInterval: null,
    };

    expect(hasAnyRoundRobinHostOverrides(overrides)).toBe(false);
  });

  it("returns true when at least one override value is present", () => {
    expect(
      hasAnyRoundRobinHostOverrides({
        minimumBookingNotice: 30,
      })
    ).toBe(true);
  });
});

describe("buildEffectiveHostLimitsProfileKey", () => {
  it("returns the same key for equivalent limits", () => {
    const keyA = buildEffectiveHostLimitsProfileKey({
      ...baseEventLimits,
      periodStartDate: new Date("2026-03-01T00:00:00.000Z"),
      periodEndDate: new Date("2026-03-10T00:00:00.000Z"),
    });

    const keyB = buildEffectiveHostLimitsProfileKey({
      ...baseEventLimits,
      periodStartDate: new Date("2026-03-01T00:00:00.000Z"),
      periodEndDate: new Date("2026-03-10T00:00:00.000Z"),
    });

    expect(keyA).toBe(keyB);
  });
});

describe("groupRoundRobinHostsByEffectiveLimits", () => {
  it("creates one bucket when no host overrides exist", () => {
    const hosts = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const buckets = groupRoundRobinHostsByEffectiveLimits({
      schedulingType: SchedulingType.ROUND_ROBIN,
      eventLimits: baseEventLimits,
      hosts,
      getHostOverrides: () => null,
    });

    expect(buckets).toHaveLength(1);
    expect(buckets[0].hosts).toEqual(hosts);
    expect(buckets[0].effectiveLimits).toEqual(baseEventLimits);
  });

  it("creates separate buckets for different round-robin host overrides", () => {
    const hosts = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const buckets = groupRoundRobinHostsByEffectiveLimits({
      schedulingType: SchedulingType.ROUND_ROBIN,
      eventLimits: baseEventLimits,
      hosts,
      getHostOverrides: (host) => {
        if (host.id === 1) {
          return { minimumBookingNotice: 30, slotInterval: 15 };
        }
        if (host.id === 2) {
          return { minimumBookingNotice: 30, slotInterval: 15 };
        }
        return { minimumBookingNotice: 60, slotInterval: 30 };
      },
    });

    expect(buckets).toHaveLength(2);

    const bucketSizes = buckets.map((bucket) => bucket.hosts.length).sort((a, b) => a - b);
    expect(bucketSizes).toEqual([1, 2]);
  });

  it("ignores host overrides when scheduling is not round-robin", () => {
    const hosts = [{ id: 1 }, { id: 2 }];

    const buckets = groupRoundRobinHostsByEffectiveLimits({
      schedulingType: SchedulingType.COLLECTIVE,
      eventLimits: baseEventLimits,
      hosts,
      getHostOverrides: (host) => ({ minimumBookingNotice: host.id * 10 }),
    });

    expect(buckets).toHaveLength(1);
    expect(buckets[0].effectiveLimits).toEqual(baseEventLimits);
  });
});

describe("getRoundRobinHostLimitOverrides", () => {
  it("returns null when host has no override fields", () => {
    expect(getRoundRobinHostLimitOverrides({})).toBeNull();
  });

  it("returns mapped override object when at least one override is set", () => {
    const overrides = getRoundRobinHostLimitOverrides({
      overrideMinimumBookingNotice: 25,
      overrideBeforeEventBuffer: 5,
      overrideSlotInterval: 15,
      overridePeriodType: PeriodType.ROLLING,
    });

    expect(overrides).toEqual({
      minimumBookingNotice: 25,
      beforeEventBuffer: 5,
      afterEventBuffer: undefined,
      slotInterval: 15,
      bookingLimits: undefined,
      durationLimits: undefined,
      periodType: PeriodType.ROLLING,
      periodDays: undefined,
      periodCountCalendarDays: undefined,
      periodStartDate: undefined,
      periodEndDate: undefined,
    });
  });
});
