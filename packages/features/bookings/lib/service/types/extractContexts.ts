import type { getEventTypeResponse } from "../../handleNewBooking/getEventTypesFromDB";
import type {
  AvailabilityContext,
  AvailabilityHost,
  BookerInfo,
  CalendarEventContext,
  PostProcessContext,
  RequestedSlot,
  ValidationContext,
} from "./contexts";

type EventType = NonNullable<getEventTypeResponse>;

export function extractValidationContext(eventType: EventType): ValidationContext {
  return {
    eventTypeId: eventType.id,
    teamId: eventType.teamId,
    requiresConfirmation: eventType.requiresConfirmation ?? false,
    minimumBookingNotice: eventType.minimumBookingNotice,
    minimumRescheduleNotice: eventType.minimumRescheduleNotice ?? null,
    seatsPerTimeSlot: eventType.seatsPerTimeSlot,
    requiresBookerEmailVerification: eventType.requiresBookerEmailVerification ?? false,
    maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
    maxActiveBookingPerBookerOfferReschedule: eventType.maxActiveBookingPerBookerOfferReschedule ?? null,
    recurringEvent: eventType.recurringEvent,
  };
}

export function extractAvailabilityContext(eventType: EventType): AvailabilityContext {
  const hosts: AvailabilityHost[] = (eventType.hosts ?? []).map((host) => ({
    userId: host.user.id,
    isFixed: host.isFixed,
    priority: host.priority ?? null,
    weight: host.weight ?? null,
    groupId: host.groupId ?? null,
  }));

  return {
    eventTypeId: eventType.id,
    schedulingType: eventType.schedulingType,
    hosts,
    duration: eventType.length,
    periodType: eventType.periodType,
    periodDays: eventType.periodDays,
    periodStartDate: eventType.periodStartDate,
    periodEndDate: eventType.periodEndDate,
    rescheduleWithSameRoundRobinHost: eventType.rescheduleWithSameRoundRobinHost ?? false,
    assignAllTeamMembers: eventType.assignAllTeamMembers ?? false,
    isRRWeightsEnabled: eventType.isRRWeightsEnabled ?? false,
    beforeEventBuffer: eventType.beforeEventBuffer,
    afterEventBuffer: eventType.afterEventBuffer,
  };
}

export function extractCalendarEventContext(eventType: EventType): CalendarEventContext {
  return {
    title: eventType.title,
    description: eventType.description,
    length: eventType.length,
    eventName: eventType.eventName,
    hideCalendarNotes: eventType.hideCalendarNotes ?? false,
    hideCalendarEventDetails: eventType.hideCalendarEventDetails ?? false,
    hideOrganizerEmail: eventType.hideOrganizerEmail ?? false,
    timeZone: eventType.timeZone,
  };
}

export function extractPostProcessContext(eventType: EventType): PostProcessContext {
  return {
    eventTypeId: eventType.id,
    teamId: eventType.teamId,
    price: eventType.price,
    currency: eventType.currency,
  };
}

interface BookingDataInput {
  email: string;
  name: string | { firstName: string; lastName?: string };
  timeZone: string;
  language: string;
  rescheduleUid?: string | null;
  smsReminderNumber?: string | null;
  attendeePhoneNumber?: string | null;
}

export function extractBookerInfo(bookingData: BookingDataInput): BookerInfo {
  return {
    email: bookingData.email,
    name: bookingData.name,
    timeZone: bookingData.timeZone,
    language: bookingData.language,
    rescheduleUid: bookingData.rescheduleUid ?? null,
    smsReminderNumber: bookingData.smsReminderNumber ?? null,
    attendeePhoneNumber: bookingData.attendeePhoneNumber ?? null,
  };
}

interface SlotInput {
  start: string;
  end: string;
  timeZone: string;
}

export function extractRequestedSlot(input: SlotInput): RequestedSlot {
  return {
    start: input.start,
    end: input.end,
    timeZone: input.timeZone,
  };
}

export interface AllContexts {
  validation: ValidationContext;
  availability: AvailabilityContext;
  calendarEvent: CalendarEventContext;
  postProcess: PostProcessContext;
}

export function extractAllContexts(eventType: EventType): AllContexts {
  return {
    validation: extractValidationContext(eventType),
    availability: extractAvailabilityContext(eventType),
    calendarEvent: extractCalendarEventContext(eventType),
    postProcess: extractPostProcessContext(eventType),
  };
}
