import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { CalIdAttendeeInBookingInfo, CalIdBookingInfo } from "../config/types";
import type { VariablesType } from "../templates/customTemplate";

const messageLogger = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

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
      .locale(eventData?.user?.locale || "en")
      .format(formatString || "YYYY MMM D");

  try {
    console.log("Got here");
    const data = {
      eventDate: formatTimestamp(eventData?.startTime, "YYYY MMM D"),
      eventTime: `${formatTimestamp(
        eventData?.startTime,
        getTimeFormatStringFromUserTimeFormat(eventData?.user?.timeFormat)
      )} ${targetTimezone}`,
    };
  } catch (e) {
    console.log("Error formatting timestamp", e);
  }

  return {
    eventName: eventData.title || "",
    organizerName: eventData.organizer.name,
    attendeeName: participantData.name,
    attendeeFirstName: participantData.firstName || participantData.name.split(" ")[0],
    attendeeLastName:
      participantData.lastName || participantData.name.split(" ").length > 1
        ? participantData.name.split(" ")[1]
        : "",
    attendeeEmail: participantData.email,
    // eventDate: dayjs(eventStartTime).tz(targetTimezone),
    eventEndTime: dayjs(eventEndTime).tz(targetTimezone),
    timeZone: targetTimezone,
    location: eventData.location,
    additionalNotes: eventData.additionalNotes,
    responses: eventData.responses,
    meetingUrl: bookingMetadataSchema.parse(eventData.metadata || {})?.videoCallUrl,
    cancelLink: `${bookerBaseUrl}/booking/${eventData.uid}?cancel=true`,
    rescheduleLink: `${bookerBaseUrl}/reschedule/${eventData.uid}`,
    ratingUrl: `${bookerBaseUrl}/booking/${eventData.uid}?rating`,
    noShowUrl: `${bookerBaseUrl}/booking/${eventData.uid}?noShow=true`,
    attendeeTimezone: eventData.attendees[0].timeZone,
    eventTimeInAttendeeTimezone: dayjs(eventStartTime).tz(eventData.attendees[0].timeZone),
    eventEndTimeInAttendeeTimezone: dayjs(eventEndTime).tz(eventData.attendees[0].timeZone),

    eventDate: formatTimestamp(eventStartTime, "YYYY MMM D"),
    eventTime: `${formatTimestamp(
      eventStartTime,
      getTimeFormatStringFromUserTimeFormat(eventData.attendees[0].timeZone)
    )} ${targetTimezone}`,
  };
};
