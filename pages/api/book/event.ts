import { Credential, Prisma, SchedulingType } from "@prisma/client";
import async from "async";
import dayjs from "dayjs";
import dayjsBusinessTime from "dayjs-business-time";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { handlePayment } from "@ee/lib/stripe/server";

import {
  sendScheduledEmails,
  sendRescheduledEmails,
  sendOrganizerRequestEmail,
} from "@lib/emails/email-manager";
import { ensureArray } from "@lib/ensureArray";
import { getErrorFromUnknown } from "@lib/errors";
import { getEventName } from "@lib/event";
import EventManager, { EventResult, PartialReference } from "@lib/events/EventManager";
import { getBusyCalendarTimes } from "@lib/integrations/calendar/CalendarManager";
import { CalendarEvent, AdditionInformation } from "@lib/integrations/calendar/interfaces/Calendar";
import { BufferedBusyTime } from "@lib/integrations/calendar/interfaces/Office365Calendar";
import logger from "@lib/logger";
import notEmpty from "@lib/notEmpty";
import prisma from "@lib/prisma";
import { BookingCreateBody } from "@lib/types/booking";
import { getBusyVideoTimes } from "@lib/videoClient";
import sendPayload from "@lib/webhooks/sendPayload";
import getSubscribers from "@lib/webhooks/subscriptions";

import { getTranslation } from "@server/lib/i18n";

import verifyAccount from "../../../web3/utils/verifyAccount";

dayjs.extend(dayjsBusinessTime);
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(timezone);

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

type BufferedBusyTimes = BufferedBusyTime[];

/**
 * Refreshes a Credential with fresh data from the database.
 *
 * @param credential
 */
async function refreshCredential(credential: Credential): Promise<Credential> {
  const newCredential = await prisma.credential.findUnique({
    where: {
      id: credential.id,
    },
  });

  if (!newCredential) {
    return credential;
  } else {
    return newCredential;
  }
}

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
async function refreshCredentials(credentials: Array<Credential>): Promise<Array<Credential>> {
  return await async.mapLimit(credentials, 5, refreshCredential);
}

function isAvailable(busyTimes: BufferedBusyTimes, time: string, length: number): boolean {
  // Check for conflicts
  let t = true;

  if (Array.isArray(busyTimes) && busyTimes.length > 0) {
    busyTimes.forEach((busyTime) => {
      const startTime = dayjs(busyTime.start);
      const endTime = dayjs(busyTime.end);

      // Check if time is between start and end times
      if (dayjs(time).isBetween(startTime, endTime, null, "[)")) {
        t = false;
      }

      // Check if slot end time is between start and end time
      if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { periodType, periodDays, periodCountCalendarDays, periodStartDate, periodEndDate, timeZone }: any // FIXME types
): boolean {
  const date = dayjs(time);

  switch (periodType) {
    case "rolling": {
      const periodRollingEndDay = periodCountCalendarDays
        ? dayjs().tz(timeZone).add(periodDays, "days").endOf("day")
        : dayjs().tz(timeZone).addBusinessTime(periodDays, "days").endOf("day");
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

const userSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    username: true,
    timeZone: true,
    credentials: true,
    bufferTime: true,
    destinationCalendar: true,
    locale: true,
  },
});

const getUserNameWithBookingCounts = async (eventTypeId: number, selectedUserNames: string[]) => {
  const users = await prisma.user.findMany({
    where: {
      username: { in: selectedUserNames },
      eventTypes: {
        some: {
          id: eventTypeId,
        },
      },
    },
    select: {
      id: true,
      username: true,
      locale: true,
    },
  });

  const userNamesWithBookingCounts = await Promise.all(
    users.map(async (user) => ({
      username: user.username,
      bookingCount: await prisma.booking.count({
        where: {
          user: {
            id: user.id,
          },
          startTime: {
            gt: new Date(),
          },
          eventTypeId,
        },
      }),
    }))
  );

  return userNamesWithBookingCounts;
};

type User = Prisma.UserGetPayload<typeof userSelect>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqBody = req.body as BookingCreateBody;
  const eventTypeId = reqBody.eventTypeId;
  const tAttendees = await getTranslation(reqBody.language ?? "en", "common");
  const tGuests = await getTranslation("en", "common");
  log.debug(`Booking eventType ${eventTypeId} started`);

  const isTimeInPast = (time: string): boolean => {
    return dayjs(time).isBefore(new Date(), "day");
  };

  if (isTimeInPast(reqBody.start)) {
    const error = {
      errorCode: "BookingDateInPast",
      message: "Attempting to create a meeting in the past.",
    };

    log.error(`Booking ${eventTypeId} failed`, error);
    return res.status(400).json(error);
  }

  const eventType = await prisma.eventType.findUnique({
    rejectOnNotFound: true,
    where: {
      id: eventTypeId,
    },
    select: {
      users: userSelect,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      title: true,
      length: true,
      eventName: true,
      schedulingType: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodDays: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      userId: true,
      price: true,
      currency: true,
      metadata: true,
      destinationCalendar: true,
    },
  });

  if (!eventType) return res.status(404).json({ message: "eventType.notFound" });

  let users = eventType.users;

  /* If this event was pre-relationship migration */
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      ...userSelect,
    });
    if (!eventTypeUser) return res.status(404).json({ message: "eventTypeUser.notFound" });
    users.push(eventTypeUser);
  }

  const organizer = await prisma.user.findUnique({
    where: {
      id: users[0].id,
    },
    select: {
      locale: true,
    },
  });

  const tOrganizer = await getTranslation(organizer?.locale ?? "en", "common");

  if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
    const bookingCounts = await getUserNameWithBookingCounts(
      eventTypeId,
      ensureArray(reqBody.user) || users.map((user) => user.username)
    );

    users = getLuckyUsers(users, bookingCounts);
  }

  const invitee = [
    {
      email: reqBody.email,
      name: reqBody.name,
      timeZone: reqBody.timeZone,
      language: { translate: tAttendees, locale: reqBody.language ?? "en" },
    },
  ];
  const guests = (reqBody.guests || []).map((guest) => {
    const g = {
      email: guest,
      name: "",
      timeZone: reqBody.timeZone,
      language: { translate: tGuests, locale: "en" },
    };
    return g;
  });

  const teamMemberPromises =
    eventType.schedulingType === SchedulingType.COLLECTIVE
      ? users.slice(1).map(async function (user) {
          return {
            email: user.email || "",
            name: user.name || "",
            timeZone: user.timeZone,
            language: {
              translate: await getTranslation(user.locale ?? "en", "common"),
              locale: user.locale ?? "en",
            },
          };
        })
      : [];

  const teamMembers = await Promise.all(teamMemberPromises);

  const attendeesList = [...invitee, ...guests, ...teamMembers];

  const seed = `${users[0].username}:${dayjs(req.body.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  const eventNameObject = {
    attendeeName: reqBody.name || "Nameless",
    eventType: eventType.title,
    eventName: eventType.eventName,
    host: users[0].name || "Nameless",
    t: tOrganizer,
  };

  const description =
    reqBody.notes +
    reqBody.customInputs.reduce(
      (str, input) => str + "<br /><br />" + input.label + ":<br />" + input.value,
      ""
    );

  const evt: CalendarEvent = {
    type: eventType.title,
    title: getEventName(eventNameObject), //this needs to be either forced in english, or fetched for each attendee and organizer separately
    description,
    startTime: reqBody.start,
    endTime: reqBody.end,
    organizer: {
      name: users[0].name || "Nameless",
      email: users[0].email || "Email-less",
      timeZone: users[0].timeZone,
      language: { translate: tOrganizer, locale: organizer?.locale ?? "en" },
    },
    attendees: attendeesList,
    location: reqBody.location, // Will be processed by the EventManager later.
    /** For team events, we will need to handle each member destinationCalendar eventually */
    destinationCalendar: eventType.destinationCalendar || users[0].destinationCalendar,
  };

  if (eventType.schedulingType === SchedulingType.COLLECTIVE) {
    evt.team = {
      members: users.map((user) => user.name || user.username || "Nameless"),
      name: eventType.team?.name || "Nameless",
    }; // used for invitee emails
  }

  // Initialize EventManager with credentials
  const rescheduleUid = reqBody.rescheduleUid;

  async function createBooking() {
    // @TODO: check as metadata
    if (req.body.web3Details) {
      const { web3Details } = req.body;
      await verifyAccount(web3Details.userSignature, web3Details.userWallet);
    }

    return prisma.booking.create({
      include: {
        user: {
          select: { email: true, name: true, timeZone: true },
        },
        attendees: true,
      },
      data: {
        uid,
        title: evt.title,
        startTime: dayjs(evt.startTime).toDate(),
        endTime: dayjs(evt.endTime).toDate(),
        description: evt.description,
        confirmed: (!eventType.requiresConfirmation && !eventType.price) || !!rescheduleUid,
        location: evt.location,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        attendees: {
          createMany: {
            data: evt.attendees.map((attendee) => {
              //if attendee is team member, it should fetch their locale not booker's locale
              //perhaps make email fetch request to see if his locale is stored, else
              const retObj = {
                name: attendee.name,
                email: attendee.email,
                timeZone: attendee.timeZone,
                locale: attendee.language.locale,
              };
              return retObj;
            }),
          },
        },
        user: {
          connect: {
            id: users[0].id,
          },
        },
        destinationCalendar: evt.destinationCalendar
          ? {
              connect: { id: evt.destinationCalendar.id },
            }
          : undefined,
      },
    });
  }

  type Booking = Prisma.PromiseReturnType<typeof createBooking>;
  let booking: Booking | null = null;
  try {
    booking = await createBooking();
    evt.uid = booking.uid;
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Booking ${eventTypeId} failed`, "Error when saving booking to db", err.message);
    if (err.code === "P2002") {
      res.status(409).json({ message: "booking.conflict" });
      return;
    }
    res.status(500).end();
    return;
  }

  let results: EventResult[] = [];
  let referencesToCreate: PartialReference[] = [];
  let user: User | null = null;

  /** Let's start cheking for availability */
  for (const currentUser of users) {
    if (!currentUser) {
      console.error(`currentUser not found`);
      return;
    }
    if (!user) user = currentUser;

    const selectedCalendars = await prisma.selectedCalendar.findMany({
      where: {
        userId: currentUser.id,
      },
    });

    const credentials = currentUser.credentials;
    if (credentials) {
      const calendarBusyTimes = await getBusyCalendarTimes(
        credentials,
        reqBody.start,
        reqBody.end,
        selectedCalendars
      );

      const videoBusyTimes = (await getBusyVideoTimes(credentials)).filter(notEmpty);
      calendarBusyTimes.push(...videoBusyTimes);
      console.log("calendarBusyTimes==>>>", calendarBusyTimes);

      const bufferedBusyTimes: BufferedBusyTimes = calendarBusyTimes.map((a) => ({
        start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toString(),
        end: dayjs(a.end).add(currentUser.bufferTime, "minute").toString(),
      }));

      let isAvailableToBeBooked = true;
      try {
        isAvailableToBeBooked = isAvailable(bufferedBusyTimes, reqBody.start, eventType.length);
      } catch {
        log.debug({
          message: "Unable set isAvailableToBeBooked. Using true. ",
        });
      }

      if (!isAvailableToBeBooked) {
        const error = {
          errorCode: "BookingUserUnAvailable",
          message: `${currentUser.name} is unavailable at this time.`,
        };

        log.debug(`Booking ${currentUser.name} failed`, error);
      }

      let timeOutOfBounds = false;

      try {
        timeOutOfBounds = isOutOfBounds(reqBody.start, {
          periodType: eventType.periodType,
          periodDays: eventType.periodDays,
          periodEndDate: eventType.periodEndDate,
          periodStartDate: eventType.periodStartDate,
          periodCountCalendarDays: eventType.periodCountCalendarDays,
          timeZone: currentUser.timeZone,
        });
      } catch {
        log.debug({
          message: "Unable set timeOutOfBounds. Using false. ",
        });
      }

      if (timeOutOfBounds) {
        const error = {
          errorCode: "BookingUserUnAvailable",
          message: `${currentUser.name} is unavailable at this time.`,
        };

        log.debug(`Booking ${currentUser.name} failed`, error);
        res.status(400).json(error);
      }
    }
  }

  if (!user) throw Error("Can't continue, user not found.");

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(user.credentials);
  const eventManager = new EventManager({ ...user, credentials });

  if (rescheduleUid) {
    // Use EventManager to conditionally use all needed integrations.
    const updateManager = await eventManager.update(evt, rescheduleUid);

    results = updateManager.results;
    referencesToCreate = updateManager.referencesToCreate;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      log.error(`Booking ${user.name} failed`, error, results);
    } else {
      const metadata: AdditionInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        const [updatedEvent] = Array.isArray(results[0].updatedEvent)
          ? results[0].updatedEvent
          : [results[0].updatedEvent];
        if (updatedEvent) {
          metadata.hangoutLink = updatedEvent.hangoutLink;
          metadata.conferenceData = updatedEvent.conferenceData;
          metadata.entryPoints = updatedEvent.entryPoints;
        }
      }

      await sendRescheduledEmails({ ...evt, additionInformation: metadata });
    }
    // If it's not a reschedule, doesn't require confirmation and there's no price,
    // Create a booking
  } else if (!eventType.requiresConfirmation && !eventType.price) {
    // Use EventManager to conditionally use all needed integrations.
    const createManager = await eventManager.create(evt);

    results = createManager.results;
    referencesToCreate = createManager.referencesToCreate;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      log.error(`Booking ${user.username} failed`, error, results);
    } else {
      const metadata: AdditionInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
      }
      await sendScheduledEmails({ ...evt, additionInformation: metadata });
    }
  }

  if (eventType.requiresConfirmation && !rescheduleUid) {
    await sendOrganizerRequestEmail(evt);
  }

  if (typeof eventType.price === "number" && eventType.price > 0) {
    try {
      const [firstStripeCredential] = user.credentials.filter((cred) => cred.type == "stripe_payment");
      if (!booking.user) booking.user = user;
      const payment = await handlePayment(evt, eventType, firstStripeCredential, booking);

      res.status(201).json({ ...booking, message: "Payment required", paymentUid: payment.uid });
      return;
    } catch (e) {
      log.error(`Creating payment failed`, e);
      res.status(500).json({ message: "Payment Failed" });
      return;
    }
  }

  log.debug(`Booking ${user.username} completed`);

  const eventTrigger = rescheduleUid ? "BOOKING_RESCHEDULED" : "BOOKING_CREATED";
  // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
  const subscribers = await getSubscribers(user.id, eventTrigger);
  console.log("evt:", {
    ...evt,
    metadata: reqBody.metadata,
  });
  const promises = subscribers.map((sub) =>
    sendPayload(
      eventTrigger,
      new Date().toISOString(),
      sub.subscriberUrl,
      {
        ...evt,
        metadata: reqBody.metadata,
      },
      sub.payloadTemplate
    ).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);

  await prisma.booking.update({
    where: {
      uid: booking.uid,
    },
    data: {
      references: {
        createMany: {
          data: referencesToCreate,
        },
      },
    },
  });

  // booking successful
  return res.status(201).json(booking);
}

export function getLuckyUsers(
  users: User[],
  bookingCounts: Prisma.PromiseReturnType<typeof getUserNameWithBookingCounts>
) {
  if (!bookingCounts.length) users.slice(0, 1);

  const [firstMostAvailableUser] = bookingCounts.sort((a, b) => (a.bookingCount > b.bookingCount ? 1 : -1));
  const luckyUser = users.find((user) => user.username === firstMostAvailableUser?.username);
  return luckyUser ? [luckyUser] : users;
}
