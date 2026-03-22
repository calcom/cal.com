import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { CalIdAttendeeInBookingInfo, CalIdBookingInfo } from "../config/types";
import type { VariablesType } from "../templates/customTemplate";

const messageLogger = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

dayjs.extend(utc);
dayjs.extend(timezone);

export const constructVariablesForTemplate = (
  eventData: CalIdBookingInfo,
  participantData: CalIdAttendeeInBookingInfo,
  eventStartTime: string,
  eventEndTime: string,
  targetTimezone: string,
  bookerBaseUrl: string
): VariablesType => {
  const formatTimestamp = (timestamp?: string, formatString?: string) =>
    dayjs(timestamp || "")
      .tz(targetTimezone)
      .locale(eventData?.organizer?.language.locale || "en")
      .format(formatString || "YYYY MMM D");
  const organizerNameSegments = eventData.organizer.name.trim().split(/\s+/).filter(Boolean);
  const attendeeNameSegments = participantData.name.trim().split(/\s+/).filter(Boolean);
  const organizerFirstName = organizerNameSegments[0] || "";
  const attendeeFirstName = participantData.firstName || attendeeNameSegments[0] || "";
  const attendeeLastName =
    participantData.lastName ||
    (attendeeNameSegments.length > 1 ? attendeeNameSegments[attendeeNameSegments.length - 1] : "");

  try {
    const data = {
      eventTime: formatTimestamp(eventData?.startTime, "ddd, MMM D, YYYY h:mma"),
    };
  } catch (e) {
    console.log("Error formatting timestamp", e);
  }

  const responses = eventData.responses;

  return {
    eventTypeName: eventData.eventType.title || "",
    eventName: eventData.title || "",
    organizerName: eventData.organizer.name,
    organizerFirstName,
    attendeeName: participantData.name,
    attendeeFirstName,
    attendeeLastName,
    attendeeEmail: participantData.email,
    eventDate: formatTimestamp(eventData?.startTime, "DD MMM YYYY"),
    eventStartTime: dayjs(eventStartTime).tz(targetTimezone),
    eventEndTime: dayjs(eventEndTime).tz(targetTimezone),
    timezone: targetTimezone,
    location: eventData.location,
    additionalNotes: eventData.additionalNotes,
    responses: eventData.responses,
    onlineMeetingUrl:
      eventData.locationType !== "inPerson"
        ? bookingMetadataSchema.parse(eventData.metadata || {})?.videoCallUrl
        : undefined,
    meetingUrl: bookingMetadataSchema.parse(eventData.metadata || {})?.videoCallUrl,
    cancelUrl: `${bookerBaseUrl}/booking/${eventData.uid}?cancel=true`,
    rescheduleUrl: `${bookerBaseUrl}/reschedule/${eventData.uid}`,
    ratingUrl: `${bookerBaseUrl}/booking/${eventData.uid}?rating`,
    noShowUrl: `${bookerBaseUrl}/booking/${eventData.uid}?noShow=true`,
    attendeeTimezone: eventData.attendees[0].timeZone,
    eventStartTimeInAttendeeTimezone: dayjs.utc(eventStartTime).tz(eventData.attendees[0].timeZone),
    eventEndTimeInAttendeeTimezone: dayjs.utc(eventEndTime).tz(eventData.attendees[0].timeZone),
    eventTime: formatTimestamp(eventData?.startTime, "ddd, MMM D, YYYY h:mma"),
    cancellationReason: eventData.cancellationReason || "",
    eventTimeFormatted: formatTimestamp(eventData?.startTime, "h:mma [GMT]Z"),
  };
};
