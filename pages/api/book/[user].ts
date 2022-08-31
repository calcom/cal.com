/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import { Logger } from "tslog";
import async from "async";
import isBetween from "dayjs/plugin/isBetween";

// import EventAttendeeMail from "../../../lib/emails/EventAttendeeMail";
import { getEventName } from "../../../lib/event";
import { LocationType } from "../../../lib/location";
import merge from "lodash.merge";
import dayjs from "dayjs";
import logger from "../../../lib/logger";
import { CalendarEvent, getBusyCalendarTimes, createEvent, updateEvent } from "../../../lib/calendarClient";
import { getBusyVideoTimes, createMeeting, updateMeeting } from "../../../lib/videoClient";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjsBusinessDays from "dayjs-business-days";

dayjs.extend(dayjsBusinessDays);
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(timezone);

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

const isEnabledUsingOneCredential = process.env.ENABLE_ONE_CREDENTIAL;

export type User = {
  id: number;
  credentials?: Credential[];
  timeZone: string;
  email: string;
  name: string;
  username: string;
};

export type PropsSplitCredentials = {
  start: string | number | Date;
  end: string | number | Date;
  user: User;
};

type Credential = {
  id: number;
  type: string;
  key: any;
  userId?: number;
};

type ResponseSplitCredentials = {
  commonAvailability: any[];
  videoCredentials: any[];
  calendarCredentials: any[];
  eventTypeOrganizer: User;
};

export type PropsRescheduleBooking = {
  videoCredentials: any[];
  calendarCredentials: any[];
  rescheduleUid?: string;
  evt: CalendarEvent;
  username: string;
};

type ResponseRescheduleBooking = {
  results: any[];
  referencesToCreate: any[];
};

type PropsCheckIsAvailableToBeBooked = {
  commonAvailability: any[];
  start: string | Date;
  selectedEventType: any;
  organizerName: string;
  loggerInstance: Logger;
};

type PropsCheckTimeoutOfBounds = {
  start: string | Date;
  selectedEventType: any;
  organizerTimezone: string;
  organizerName: string;
  loggerInstance: Logger;
};

function isAvailable(busyTimes, time, length) {
  // Check for conflicts
  let t = true;

  if (Array.isArray(busyTimes) && busyTimes.length > 0) {
    busyTimes.forEach((busyTime) => {
      const startTime = dayjs(busyTime.start);
      const endTime = dayjs(busyTime.end);
      const currentTime = dayjs(time);

      // Check if start times are the same
      if (currentTime.format("HH:mm") == startTime.format("HH:mm")) {
        t = false;
      }

      // Check if time is between start and end times
      if (currentTime.isBetween(startTime, endTime)) {
        t = false;
      }

      // Check if slot end time is between start and end time
      if (currentTime.add(length, "minutes").isBetween(startTime, endTime)) {
        t = false;
      }

      // Check if startTime is between slot
      if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
        t = false;
      }
    });
  }

  return t;
}

function isOutOfBounds(
  time: dayjs.ConfigType,
  { periodType, periodDays, periodCountCalendarDays, periodStartDate, periodEndDate, timeZone }
): boolean {
  const date = dayjs(time);

  switch (periodType) {
    case "rolling": {
      const periodRollingEndDay = periodCountCalendarDays
        ? dayjs().tz(timeZone).add(periodDays, "days").endOf("day")
        : dayjs().tz(timeZone).businessDaysAdd(periodDays, "days").endOf("day");
      return date.endOf("day").isAfter(periodRollingEndDay);
    }

    case "range": {
      const periodRangeStartDay = dayjs(periodStartDate).tz(timeZone).endOf("day");
      const periodRangeEndDay = dayjs(periodEndDate).tz(timeZone).endOf("day");
      return date.endOf("day").isBefore(periodRangeStartDay) || date.endOf("day").isAfter(periodRangeEndDay);
    }

    case "unlimited":
    default:
      return false;
  }
}

interface GetLocationRequestFromIntegrationRequest {
  location: string;
}

export const getLocationRequestFromIntegration = ({ location }: GetLocationRequestFromIntegrationRequest) => {
  if (location === LocationType.GoogleMeet.valueOf()) {
    const requestId = uuidv5(location, uuidv5.URL);

    return {
      conferenceData: {
        createRequest: {
          requestId: requestId,
        },
      },
      location,
    };
  }

  return null;
};

export const checkBookingInThePast = (start: string | Date, user: string | string[]): void => {
  const isTimeInPast = (time) => {
    return dayjs(time).isBefore(new Date(), "day");
  };

  if (isTimeInPast(start)) {
    const error = {
      errorCode: "BookingDateInPast",
      message: "Attempting to create a meeting in the past.",
    };

    log.error(`Booking ${user} failed`, error);

    throw { error, status: 400 };
  }
};

export const splitCredentials = async (props: PropsSplitCredentials): Promise<ResponseSplitCredentials> => {
  try {
    const { user: currentUser, start, end } = props;

    const selectedCalendars = await prisma.selectedCalendar.findMany({
      where: {
        userId: currentUser.id,
      },
    });

    // Split credentials up into calendar credentials and video credentials
    let calendarCredentials = currentUser.credentials.filter((cred) => cred.type.endsWith("_calendar"));
    let videoCredentials = currentUser.credentials.filter((cred) => cred.type.endsWith("_video"));

    const hasCalendarIntegrations = calendarCredentials.length > 0;
    const hasVideoIntegrations = videoCredentials.length > 0;

    let calendarAvailability: any[] = [];
    let videoAvailability: any[] = [];
    if (!isEnabledUsingOneCredential) {
      calendarAvailability = (await getBusyCalendarTimes(
        currentUser.credentials,
        dayjs(start).startOf("day").utc().format(),
        dayjs(end).endOf("day").utc().format(),
        selectedCalendars
      )) as any[];

      videoAvailability = (await getBusyVideoTimes(
        currentUser.credentials,
        dayjs(start).startOf("day").utc().format(),
        dayjs(end).endOf("day").utc().format()
      )) as any[];
    }

    let commonAvailability = [];

    if (hasCalendarIntegrations && hasVideoIntegrations && !isEnabledUsingOneCredential) {
      commonAvailability = (calendarAvailability as []).filter((availability) =>
        videoAvailability.includes(availability)
      );
    } else if (hasVideoIntegrations && !isEnabledUsingOneCredential) {
      commonAvailability = videoAvailability;
    } else if (hasCalendarIntegrations && !isEnabledUsingOneCredential) {
      commonAvailability = calendarAvailability as [];
    }

    // Now, get the newly stored credentials (new refresh token for example).
    const currentUserAfterUpdated = await prisma.user.findFirst({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
      },
    });
    calendarCredentials = currentUserAfterUpdated.credentials.filter((cred) =>
      cred.type.endsWith("_calendar")
    );
    videoCredentials = currentUserAfterUpdated.credentials.filter((cred) => cred.type.endsWith("_video"));

    return {
      commonAvailability,
      calendarCredentials,
      videoCredentials,
      eventTypeOrganizer: currentUser,
    };
  } catch (e) {
    console.log({ e });
  }
};

export const checkIsAvailableToBeBooked = (props: PropsCheckIsAvailableToBeBooked): void => {
  const { commonAvailability, start, selectedEventType, organizerName, loggerInstance } = props;
  let isAvailableToBeBooked = false;

  try {
    isAvailableToBeBooked = isAvailable(commonAvailability, start, selectedEventType.length);
  } catch (e) {
    loggerInstance.debug({
      message: "Unable set isAvailableToBeBooked. Using true. ",
    });
  }

  if (!isAvailableToBeBooked) {
    const error = {
      errorCode: "BookingUserUnAvailable",
      message: `${organizerName} is unavailable at this time.`,
    };

    loggerInstance.debug(`Booking ${organizerName} failed`, error);
    throw { error, status: 400 };
  }
};

export const checkTimeoutOfBounds = (props: PropsCheckTimeoutOfBounds): boolean => {
  if (checkTimeoutOfBounds) return false;
  const { start, selectedEventType, organizerTimezone, organizerName, loggerInstance } = props;
  let timeOutOfBounds = false;

  try {
    timeOutOfBounds = isOutOfBounds(start, {
      periodType: selectedEventType.periodType,
      periodDays: selectedEventType.periodDays,
      periodEndDate: selectedEventType.periodEndDate,
      periodStartDate: selectedEventType.periodStartDate,
      periodCountCalendarDays: selectedEventType.periodCountCalendarDays,
      timeZone: organizerTimezone,
    });
  } catch {
    loggerInstance.debug({
      message: "Unable set timeOutOfBounds. Using false. ",
    });
  }

  if (timeOutOfBounds) {
    const error = {
      errorCode: "BookingUserUnAvailable",
      message: `${organizerName} is unavailable at this time.`,
    };

    loggerInstance.debug(`Booking ${organizerName} failed`, error);
  }

  return timeOutOfBounds;
};

export const rescheduleBooking = async (
  props: PropsRescheduleBooking
): Promise<ResponseRescheduleBooking> => {
  const { rescheduleUid, calendarCredentials, evt, videoCredentials, username } = props;
  let results = [];
  let referencesToCreate = [];

  const booking = await prisma.booking.findFirst({
    where: {
      uid: rescheduleUid,
    },
    select: {
      id: true,
      references: {
        select: {
          id: true,
          type: true,
          uid: true,
        },
      },
    },
  });

  // Use all integrations
  results = results.concat(
    await async.mapLimit(calendarCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      return updateEvent(credential, bookingRefUid, evt)
        .then((response) => {
          return { type: credential.type, success: true, response };
        })
        .catch((e) => {
          log.error("updateEvent failed", e, evt);
          return { type: credential.type, success: false };
        });
    })
  );

  results = results.concat(
    await async.mapLimit(videoCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      return updateMeeting(credential, bookingRefUid, evt)
        .then((response) => {
          return { type: credential.type, success: true, response };
        })
        .catch((e) => {
          log.error("updateMeeting failed", e, evt);
          return { type: credential.type, success: false };
        });
    })
  );

  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingReschedulingMeetingFailed",
      message: "Booking Rescheduling failed",
    };

    log.error(`Booking ${username} failed`, error, results);

    throw { error, status: 500 };
  }

  // Clone elements
  referencesToCreate = [...booking.references];
  referencesToCreate = results.map((result: any) => {
    return {
      type: result.type,
      uid: result.createdEvent?.id?.toString() ?? "",
      meetingId: result.createdEvent?.id.toString(),
      meetingPassword: result.createdEvent?.password,
      meetingUrl: result.createdEvent?.url,
    };
  });

  // Now we can delete the old booking and its references.
  const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
    where: {
      bookingId: booking.id,
    },
  });
  const attendeeDeletes = prisma.attendee.deleteMany({
    where: {
      bookingId: booking.id,
    },
  });
  const bookingDeletes = prisma.booking.delete({
    where: {
      uid: rescheduleUid,
    },
  });

  await Promise.all([bookingReferenceDeletes, attendeeDeletes, bookingDeletes]);

  return { referencesToCreate, results };
};

export const scheduleBooking = async (props: PropsRescheduleBooking): Promise<ResponseRescheduleBooking> => {
  let results = [];
  let referencesToCreate = [];
  const { calendarCredentials, videoCredentials, evt, username } = props;

  results = results.concat(
    await async.mapLimit(calendarCredentials, 5, async (credential) => {
      return createEvent(credential, evt)
        .then((response) => ({ type: credential.type, success: true, response }))
        .catch((e) => {
          log.error("createEvent failed", e, evt);
          return { type: credential.type, success: false };
        });
    })
  );

  results = results.concat(
    await async.mapLimit(videoCredentials, 5, async (credential) => {
      return createMeeting(credential, evt)
        .then((response) => {
          log.error("createMeeting success", evt);
          return { type: credential.type, success: true, response };
        })
        .catch((e) => {
          log.error("createMeeting failed", e, evt);
          return { type: credential.type, success: false };
        });
    })
  );

  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingCreatingMeetingFailed",
      message: "Booking failed",
    };

    log.error(`Booking ${username} failed`, error, results);

    throw { error, status: 500 };
  }

  referencesToCreate = results.map((result) => {
    return {
      type: result.type,
      uid: result.response.createdEvent.id.toString(),
    };
  });

  return { results, referencesToCreate };
};

export const generateHashUid = (results: any, evt: CalendarEvent): string => {
  return results.length > 0
    ? results[0].response.uid
    : translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { user } = req.query;
  log.debug(`Booking ${user} started`);

  try {
    const { start, end } = req.body;
    await checkBookingInThePast(start, user);

    const currentUser = await prisma.user.findFirst({
      where: {
        username: user as string,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
        username: true,
      },
    });

    const props: PropsSplitCredentials = {
      start,
      end,
      user: currentUser,
    };
    const { commonAvailability, calendarCredentials, videoCredentials, eventTypeOrganizer } =
      await splitCredentials(props);
    const rescheduleUid = req.body.rescheduleUid;

    const selectedEventType = await prisma.eventType.findFirst({
      where: {
        id: req.body.eventTypeId,
      },
      select: {
        eventName: true,
        title: true,
        length: true,
        periodType: true,
        periodDays: true,
        periodStartDate: true,
        periodEndDate: true,
        periodCountCalendarDays: true,
      },
    });

    const rawLocation = req.body.location;

    let evt: CalendarEvent = {
      type: selectedEventType.title,
      title: getEventName(req.body.name, selectedEventType.title, selectedEventType.eventName),
      description: req.body.notes,
      startTime: req.body.start,
      endTime: req.body.end,
      organizer: {
        email: eventTypeOrganizer.email,
        name: eventTypeOrganizer.name,
        timeZone: eventTypeOrganizer.timeZone,
      },
      attendees: [{ email: req.body.email, name: req.body.name, timeZone: req.body.timeZone }],
    };

    // If phone or inPerson use raw location
    // set evt.location to req.body.location
    if (!rawLocation?.includes("integration")) {
      evt.location = rawLocation;
    }

    // If location is set to an integration location
    // Build proper transforms for evt object
    // Extend evt object with those transformations
    if (rawLocation?.includes("integration")) {
      const maybeLocationRequestObject = getLocationRequestFromIntegration({
        location: rawLocation,
      });

      evt = merge(evt, maybeLocationRequestObject);
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        userId: eventTypeOrganizer.id,
        title: evt.type,
      },
      select: {
        id: true,
      },
    });

    checkIsAvailableToBeBooked({
      commonAvailability,
      start,
      selectedEventType,
      organizerName: eventTypeOrganizer.name,
      loggerInstance: log,
    });

    checkTimeoutOfBounds({
      start,
      selectedEventType,
      organizerTimezone: eventTypeOrganizer.timeZone,
      organizerName: eventTypeOrganizer.name,
      loggerInstance: log,
    });

    let results = [];
    let referencesToCreate = [];

    if (rescheduleUid) {
      // Reschedule event
      const props: PropsRescheduleBooking = {
        videoCredentials,
        calendarCredentials,
        evt,
        rescheduleUid,
        username: user as string,
      };
      const { results: rescheduleResults, referencesToCreate: rescheduleReference } = await rescheduleBooking(
        props
      );

      results = [...rescheduleResults];
      referencesToCreate = [...rescheduleReference];
    } else {
      // Schedule event
      const props: PropsRescheduleBooking = {
        videoCredentials,
        calendarCredentials,
        evt,
        username: user as string,
      };
      const { results: scheduleResults, referencesToCreate: scheduleReference } = await scheduleBooking(
        props
      );

      results = [...scheduleResults];
      referencesToCreate = [...scheduleReference];
    }

    const hashUID = generateHashUid(results, evt);
    // TODO Should just be set to the true case as soon as we have a "bare email" integration class.
    // UID generation should happen in the integration itself, not here.
    // if (results.length === 0) {
    //   // Legacy as well, as soon as we have a separate email integration class. Just used
    //   // to send an email even if there is no integration at all.
    //   try {
    //     const mail = new EventAttendeeMail(evt, hashUID);
    //     await mail.sendEmail();
    //   } catch (e) {
    //     log.error("Sending legacy event mail failed", e);
    //     log.error(`Booking ${user} failed`);

    //     throw { error: "Booking failed", status: 500 };
    //   }
    // }

    try {
      await prisma.booking.create({
        data: {
          uid: hashUID,
          userId: eventTypeOrganizer.id,
          references: {
            create: referencesToCreate,
          },
          eventTypeId: eventType.id,
          title: evt.title,
          description: evt.description,
          startTime: evt.startTime,
          endTime: evt.endTime,
          attendees: {
            create: evt.attendees,
          },
        },
      });
    } catch (e) {
      log.error(`Booking ${user} failed`, "Error when saving booking to db", e);
      const error = "Booking already exists";

      throw { error, status: 500 };
    }

    log.debug(`Booking ${user} completed`);
    return res.status(204).json({ message: "Booking completed" });
  } catch (reason) {
    log.error(`Booking ${user} failed`, reason);
    const { error, status } = reason;

    return res.status(status || 500).json({ message: error || "Booking failed for some unknown reason" });
  }
}
