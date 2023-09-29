import type { CalendarEvent } from "@calcom/types/Calendar";

export function getPiiFreeCalendarEvent(calEvent: CalendarEvent) {
  return {
    eventTypeId: calEvent.eventTypeId,
    type: calEvent.type,
    startTime: calEvent.startTime,
    endTime: calEvent.endTime,
    schedulingType: calEvent.schedulingType,
    seatsPerTimeSlot: calEvent.seatsPerTimeSlot,
    appsStatus: calEvent.appsStatus,
    recurringEvent: calEvent.recurringEvent,
    recurrence: calEvent.recurrence,
    requiresConfirmation: calEvent.requiresConfirmation,
    uid: calEvent.uid,
    /**
     * Let's just get a boolean value for PII sensitive fields so that we atleast know if it's present or not
     */
    // Not okay to have title which can have Booker and Organizer names
    title: !!calEvent.title,
    // .... Add all other props here that we don't want to be logged. It prevents those properties from being logged accidentally
  };
}

export function getPiiFreeBooking(booking: {
  id: number;
  uid: string;
  userId: number | null;
  startTime: Date;
  endTime: Date;
  title: string;
}) {
  return {
    id: booking.id,
    uid: booking.uid,
    userId: booking.userId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    /**
     * Let's just get a boolean value for PII sensitive fields so that we atleast know if it's present or not
     */
    // Not okay to have title which can have Booker and Organizer names
    title: !!booking.title,
    // .... Add all other props here that we don't want to be logged. It prevents those properties from being logged accidentally
  };
}
