import type { Prisma } from "@prisma/client";
import type { TFunction } from "i18next";
import { createEvent } from "ics";
import { RRule } from "rrule";
import type { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { nameObjectSchema } from "@calcom/lib/event";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { getEventName } from "../event";

const buildICalLink = ({
  startTime,
  endTime,
  title,
  description,
  location,
}: {
  startTime: Dayjs;
  endTime: Dayjs;
  title: string;
  description: string | null;
  location: string | null;
}) => {
  const durationInMinutes = endTime.diff(startTime, "minutes");

  const iCalEvent = createEvent({
    start: [
      startTime.toDate().getUTCFullYear(),
      (startTime.toDate().getUTCMonth() as number) + 1,
      startTime.toDate().getUTCDate(),
      startTime.toDate().getUTCHours(),
      startTime.toDate().getUTCMinutes(),
    ],
    startInputType: "utc",
    title,
    duration: {
      minutes: durationInMinutes,
    },
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
  });

  if (iCalEvent.error) {
    throw iCalEvent.error;
  }

  return encodeURIComponent(iCalEvent.value ? iCalEvent.value : false);
};

const buildGoogleCalendarLink = ({
  startTime,
  endTime,
  eventName,
  eventDescription,
  bookingLocation,
  parsedRecurringEvent,
}: {
  startTime: Dayjs;
  endTime: Dayjs;
  eventName: string;
  eventDescription: string | null;
  bookingLocation: string | null;
  parsedRecurringEvent: ReturnType<typeof parseRecurringEvent> | null;
}) => {
  const googleCalendarLink = `https://calendar.google.com/calendar/r/eventedit?dates=${startTime
    .utc()
    .format("YYYYMMDDTHHmmss[Z]")}/${endTime.utc().format("YYYYMMDDTHHmmss[Z]")}&text=${encodeURIComponent(
    eventName
  )}&details=${encodeURIComponent(eventDescription ?? "")}${
    bookingLocation ? `&location=${encodeURIComponent(bookingLocation)}` : ""
  }${parsedRecurringEvent ? `&recur=${encodeURIComponent(new RRule(parsedRecurringEvent).toString())}` : ""}`;
  return googleCalendarLink;
};

const buildOffice365Link = ({
  startTime,
  endTime,
  eventName,
  eventDescription,
  bookingLocation,
}: {
  startTime: Dayjs;
  endTime: Dayjs;
  eventName: string;
  eventDescription: string | null;
  bookingLocation: string | null;
}) => {
  // TODO: Why do we need to encode URI this href but not the google calendar link?
  const office365Link = `https://outlook.office.com/calendar/0/deeplink/compose?body=${encodeURIComponent(
    eventDescription ?? ""
  )}&enddt=${endTime.utc().format()}&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=${startTime
    .utc()
    .format()}&subject=${encodeURIComponent(eventName)}${
    bookingLocation ? `&location=${encodeURIComponent(bookingLocation)}` : ""
  }`;
  return office365Link;
};

const buildOutlookLink = ({
  startTime,
  endTime,
  eventName,
  eventDescription,
  bookingLocation,
}: {
  startTime: Dayjs;
  endTime: Dayjs;
  eventName: string;
  eventDescription: string | null;
  bookingLocation: string | null;
}) => {
  const outlookLink =
    encodeURI(
      `https://outlook.live.com/calendar/0/deeplink/compose?body=${eventDescription}&enddt=${endTime
        .utc()
        .format()}&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=${startTime
        .utc()
        .format()}&subject=${eventName}`
    ) + (bookingLocation ? `&location=${encodeURIComponent(bookingLocation)}` : "");
  return outlookLink;
};

export const getCalendarLinks = async ({
  booking,
  eventType,
  t,
}: {
  booking: {
    startTime: string;
    endTime: string;
    location: string;
    title: string;
    responses: Prisma.JsonObject;
    metadata: Prisma.JsonObject;
  };
  eventType: {
    recurringEvent: string;
    description: string;
    eventName: string;
    isDynamic: boolean;
    length: number;
    team: {
      name: string;
    } | null;
    users: {
      name: string;
    }[];
    title: string;
  };
  t: TFunction;
}) => {
  let evtName = eventType.eventName;
  const videoCallUrl = bookingMetadataSchema.parse(booking?.metadata || {})?.videoCallUrl ?? null;

  if (eventType.isDynamic && booking.responses?.title) {
    evtName = booking.responses.title as string;
  }
  const eventNameObject = {
    attendeeName: booking.responses.name as z.infer<typeof nameObjectSchema> | string,
    eventType: eventType.title,
    eventName: evtName,
    host: eventType.team?.name || eventType.users[0]?.name || "Nameless",
    // TO-TEST: What location is it supposed to be ? That is stored in DB or somehing else?
    location: booking.location,
    bookingFields: booking.responses,
    eventDuration: eventType.length,
    t,
  };

  // Create event name and description
  const eventName = getEventName(eventNameObject, true);
  const eventDescription = eventType?.description || "";

  // Calculate start and end times
  const startTime = dayjs(booking.startTime);
  const endTime = dayjs(booking.endTime);
  const parsedRecurringEvent = parseRecurringEvent(eventType?.recurringEvent || "");

  const googleCalendarLink = buildGoogleCalendarLink({
    startTime,
    endTime,
    eventName,
    eventDescription,
    bookingLocation: videoCallUrl ?? null,
    parsedRecurringEvent,
  });

  // Generate Office 365 link
  const office365Link = buildOffice365Link({
    startTime,
    endTime,
    eventName,
    eventDescription,
    bookingLocation: videoCallUrl,
  });

  const outlookLink = buildOutlookLink({
    startTime,
    endTime,
    eventName,
    eventDescription,
    bookingLocation: videoCallUrl,
  });

  // Generate ICS file link
  let icsFileLink = "";
  try {
    icsFileLink = buildICalLink({
      startTime,
      endTime,
      title: eventName,
      description: eventDescription ?? null,
      location: videoCallUrl ?? null,
    });
  } catch (error) {
    console.error("Error generating ICS file", error);
  }

  return [
    {
      label: "Google Calendar",
      link: googleCalendarLink,
    },
    {
      label: "Office 365",
      link: office365Link,
    },
    {
      label: "ICS",
      link: icsFileLink,
    },
    {
      label: "Outlook",
      link: outlookLink,
    },
  ];
};
