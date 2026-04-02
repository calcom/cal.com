import type { JsonValue } from "@calcom/prisma/client/runtime/library";
import { PeriodType, SchedulingType } from "@calcom/prisma/enums";

type EventLevelLimits = {
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  slotInterval: number | null;
  bookingLimits: JsonValue | null;
  durationLimits: JsonValue | null;
  periodType: PeriodType;
  periodDays: number | null;
  periodCountCalendarDays: boolean | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
};

export type RoundRobinHostLimitOverrides = {
  minimumBookingNotice?: number | null;
  beforeEventBuffer?: number | null;
  afterEventBuffer?: number | null;
  slotInterval?: number | null;
  bookingLimits?: JsonValue | null;
  durationLimits?: JsonValue | null;
  periodType?: PeriodType | null;
  periodDays?: number | null;
  periodCountCalendarDays?: boolean | null;
  periodStartDate?: Date | null;
  periodEndDate?: Date | null;
};

export type RoundRobinHostLimitOverrideSource = {
  overrideMinimumBookingNotice?: number | null;
  overrideBeforeEventBuffer?: number | null;
  overrideAfterEventBuffer?: number | null;
  overrideSlotInterval?: number | null;
  overrideBookingLimits?: JsonValue | null;
  overrideDurationLimits?: JsonValue | null;
  overridePeriodType?: PeriodType | null;
  overridePeriodDays?: number | null;
  overridePeriodCountCalendarDays?: boolean | null;
  overridePeriodStartDate?: Date | null;
  overridePeriodEndDate?: Date | null;
};

export type EffectiveHostLimits = EventLevelLimits;

export type EffectiveLimitBucket<THost> = {
  profileKey: string;
  effectiveLimits: EffectiveHostLimits;
  hosts: THost[];
};

export function resolveRoundRobinHostEffectiveLimits({
  schedulingType,
  eventLimits,
  hostOverrides,
}: {
  schedulingType: SchedulingType | null;
  eventLimits: EventLevelLimits;
  hostOverrides?: RoundRobinHostLimitOverrides | null;
}): EffectiveHostLimits {
  // Contract: overrides apply only to round-robin hosts.
  if (schedulingType !== SchedulingType.ROUND_ROBIN || !hostOverrides) {
    return { ...eventLimits };
  }

  return {
    minimumBookingNotice: hostOverrides.minimumBookingNotice ?? eventLimits.minimumBookingNotice,
    beforeEventBuffer: hostOverrides.beforeEventBuffer ?? eventLimits.beforeEventBuffer,
    afterEventBuffer: hostOverrides.afterEventBuffer ?? eventLimits.afterEventBuffer,
    slotInterval: hostOverrides.slotInterval ?? eventLimits.slotInterval,
    bookingLimits: hostOverrides.bookingLimits ?? eventLimits.bookingLimits,
    durationLimits: hostOverrides.durationLimits ?? eventLimits.durationLimits,
    periodType: hostOverrides.periodType ?? eventLimits.periodType,
    periodDays: hostOverrides.periodDays ?? eventLimits.periodDays,
    periodCountCalendarDays:
      hostOverrides.periodCountCalendarDays ?? eventLimits.periodCountCalendarDays,
    periodStartDate: hostOverrides.periodStartDate ?? eventLimits.periodStartDate,
    periodEndDate: hostOverrides.periodEndDate ?? eventLimits.periodEndDate,
  };
}

export function hasAnyRoundRobinHostOverrides(
  hostOverrides?: RoundRobinHostLimitOverrides | null
): boolean {
  if (!hostOverrides) {
    return false;
  }

  return Object.values(hostOverrides).some((value) => value !== null && value !== undefined);
}

export function getRoundRobinHostLimitOverrides(
  host: RoundRobinHostLimitOverrideSource
): RoundRobinHostLimitOverrides | null {
  const resolvedOverrides: RoundRobinHostLimitOverrides = {
    minimumBookingNotice: host.overrideMinimumBookingNotice,
    beforeEventBuffer: host.overrideBeforeEventBuffer,
    afterEventBuffer: host.overrideAfterEventBuffer,
    slotInterval: host.overrideSlotInterval,
    bookingLimits: host.overrideBookingLimits,
    durationLimits: host.overrideDurationLimits,
    periodType: host.overridePeriodType,
    periodDays: host.overridePeriodDays,
    periodCountCalendarDays: host.overridePeriodCountCalendarDays,
    periodStartDate: host.overridePeriodStartDate,
    periodEndDate: host.overridePeriodEndDate,
  };

  return hasAnyRoundRobinHostOverrides(resolvedOverrides) ? resolvedOverrides : null;
}

export function buildEffectiveHostLimitsProfileKey(effectiveLimits: EffectiveHostLimits): string {
  return JSON.stringify({
    ...effectiveLimits,
    periodStartDate: effectiveLimits.periodStartDate?.toISOString() ?? null,
    periodEndDate: effectiveLimits.periodEndDate?.toISOString() ?? null,
  });
}

export function groupRoundRobinHostsByEffectiveLimits<THost>({
  schedulingType,
  eventLimits,
  hosts,
  getHostOverrides,
}: {
  schedulingType: SchedulingType | null;
  eventLimits: EventLevelLimits;
  hosts: THost[];
  getHostOverrides: (host: THost) => RoundRobinHostLimitOverrides | null | undefined;
}): EffectiveLimitBucket<THost>[] {
  const bucketsByKey = new Map<string, EffectiveLimitBucket<THost>>();

  for (const host of hosts) {
    const effectiveLimits = resolveRoundRobinHostEffectiveLimits({
      schedulingType,
      eventLimits,
      hostOverrides: getHostOverrides(host),
    });

    const profileKey = buildEffectiveHostLimitsProfileKey(effectiveLimits);
    const existingBucket = bucketsByKey.get(profileKey);

    if (existingBucket) {
      existingBucket.hosts.push(host);
      continue;
    }

    bucketsByKey.set(profileKey, {
      profileKey,
      effectiveLimits,
      hosts: [host],
    });
  }

  return [...bucketsByKey.values()];
}
