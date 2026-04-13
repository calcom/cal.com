import { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import type { TUpdateInputSchema } from "./update.schema";

type HostWithOverridesInput = NonNullable<TUpdateInputSchema["hosts"]>[number];

type HostWithOverridesCreateInput = HostWithOverridesInput & {
  createdAt?: Date | null;
  weightAdjustment?: number | null;
  memberId?: number | null;
};

type HostCreateData = Prisma.HostUncheckedCreateWithoutEventTypeInput;
type HostUpdateData = Prisma.HostUncheckedUpdateWithoutEventTypeInput;

const toNullableJsonInput = (value: Prisma.InputJsonValue | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? Prisma.JsonNull : value;
};

export const mapHostCreateData = ({
  host,
  schedulingType,
}: {
  host: HostWithOverridesCreateInput;
  schedulingType: SchedulingType | null | undefined;
}): HostCreateData => {
  const hostData: HostCreateData = {
    userId: host.userId,
    isFixed: schedulingType === SchedulingType.COLLECTIVE || host.isFixed || false,
    priority: host.priority ?? 2,
    weight: host.weight ?? 100,
    groupId: host.groupId,
    scheduleId: host.scheduleId ?? null,
    overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
    overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
    overrideAfterEventBuffer: host.overrideAfterEventBuffer,
    overrideSlotInterval: host.overrideSlotInterval,
    overrideBookingLimits: toNullableJsonInput(host.overrideBookingLimits),
    overrideDurationLimits: toNullableJsonInput(host.overrideDurationLimits),
    overridePeriodType: host.overridePeriodType,
    overridePeriodStartDate: host.overridePeriodStartDate,
    overridePeriodEndDate: host.overridePeriodEndDate,
    overridePeriodDays: host.overridePeriodDays,
    overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
  };

  if (host.createdAt !== undefined) {
    hostData.createdAt = host.createdAt;
  }

  if (host.weightAdjustment !== undefined) {
    hostData.weightAdjustment = host.weightAdjustment;
  }

  if (host.memberId !== undefined) {
    hostData.memberId = host.memberId;
  }

  if (host.location) {
    hostData.location = {
      create: {
        type: host.location.type,
        credentialId: host.location.credentialId,
        link: host.location.link,
        address: host.location.address,
        phoneNumber: host.location.phoneNumber,
      },
    };
  }

  return hostData;
};

export const mapHostUpdateData = ({
  host,
  schedulingType,
}: {
  host: HostWithOverridesInput;
  schedulingType: SchedulingType | null | undefined;
}): HostUpdateData => {
  const updateData: HostUpdateData = {
    isFixed: schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
    priority: host.priority ?? 2,
    weight: host.weight ?? 100,
    scheduleId: host.scheduleId === undefined ? undefined : host.scheduleId,
    groupId: host.groupId,
    overrideMinimumBookingNotice: host.overrideMinimumBookingNotice,
    overrideBeforeEventBuffer: host.overrideBeforeEventBuffer,
    overrideAfterEventBuffer: host.overrideAfterEventBuffer,
    overrideSlotInterval: host.overrideSlotInterval,
    overrideBookingLimits: toNullableJsonInput(host.overrideBookingLimits),
    overrideDurationLimits: toNullableJsonInput(host.overrideDurationLimits),
    overridePeriodType: host.overridePeriodType,
    overridePeriodStartDate: host.overridePeriodStartDate,
    overridePeriodEndDate: host.overridePeriodEndDate,
    overridePeriodDays: host.overridePeriodDays,
    overridePeriodCountCalendarDays: host.overridePeriodCountCalendarDays,
  };

  if (host.location) {
    updateData.location = {
      upsert: {
        create: {
          type: host.location.type,
          credentialId: host.location.credentialId,
          link: host.location.link,
          address: host.location.address,
          phoneNumber: host.location.phoneNumber,
        },
        update: {
          type: host.location.type,
          credentialId: host.location.credentialId,
          link: host.location.link,
          address: host.location.address,
          phoneNumber: host.location.phoneNumber,
        },
      },
    };
  }

  return updateData;
};
