import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser } from "./types";

export type EventLimitFields = Pick<
  getEventTypeResponse,
  | "minimumBookingNotice"
  | "beforeEventBuffer"
  | "afterEventBuffer"
  | "slotInterval"
  | "bookingLimits"
  | "durationLimits"
  | "periodType"
  | "periodDays"
  | "periodCountCalendarDays"
  | "periodStartDate"
  | "periodEndDate"
>;

export type EventTypeResponseWithIsFixedAwareUsers = Omit<getEventTypeResponse, "users"> & {
  users: IsFixedAwareUser[];
};

export const getEventLevelLimits = <T extends EventLimitFields>(eventType: T): EventLimitFields => ({
  minimumBookingNotice: eventType.minimumBookingNotice,
  beforeEventBuffer: eventType.beforeEventBuffer,
  afterEventBuffer: eventType.afterEventBuffer,
  slotInterval: eventType.slotInterval,
  bookingLimits: eventType.bookingLimits,
  durationLimits: eventType.durationLimits,
  periodType: eventType.periodType,
  periodDays: eventType.periodDays,
  periodCountCalendarDays: eventType.periodCountCalendarDays,
  periodStartDate: eventType.periodStartDate,
  periodEndDate: eventType.periodEndDate,
});

export const buildEventTypeWithEffectiveLimits = <T extends EventLimitFields>(params: {
  eventType: T;
  effectiveLimits: EventLimitFields;
}): T => {
  const { eventType, effectiveLimits } = params;

  return {
    ...eventType,
    minimumBookingNotice: effectiveLimits.minimumBookingNotice,
    beforeEventBuffer: effectiveLimits.beforeEventBuffer,
    afterEventBuffer: effectiveLimits.afterEventBuffer,
    slotInterval: effectiveLimits.slotInterval,
    bookingLimits: effectiveLimits.bookingLimits,
    durationLimits: effectiveLimits.durationLimits,
    periodType: effectiveLimits.periodType,
    periodDays: effectiveLimits.periodDays,
    periodCountCalendarDays: effectiveLimits.periodCountCalendarDays,
    periodStartDate: effectiveLimits.periodStartDate,
    periodEndDate: effectiveLimits.periodEndDate,
  };
};
