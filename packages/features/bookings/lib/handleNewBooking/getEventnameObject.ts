import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";

import type { BookingResponses } from "./getBookingData";
import type { getEventType } from "./getEventType";

export const getEventNameObject: (params: {
  attendeeName: string;
  eventType: Pick<Awaited<ReturnType<typeof getEventType>>, "title" | "schedulingType" | "team" | "length">;
  eventName: string;
  numberOfUsers: number;
  organizerName: string;
  location: string;
  tOrganizer: TFunction;
  bookingFields: BookingResponses;
}) => EventNameObjectType = ({
  attendeeName,
  eventType,
  eventName,
  numberOfUsers,
  organizerName,
  location,
  tOrganizer,
  bookingFields,
}) => {
  const eventNameObject = {
    attendeeName,
    eventType: eventType.title,
    eventName,
    // we send on behalf of team if >1 round robin attendee | collective
    teamName: eventType.schedulingType === "COLLECTIVE" || numberOfUsers > 1 ? eventType.team?.name : null,
    organizerName,
    location,
    t: tOrganizer,
    bookingFields,
    host: organizerName,
    eventDuration: eventType.length,
  };

  return eventNameObject;
};
