import { BookingStatus, Credential, Prisma, SchedulingType, WebhookTriggerEvents } from "@prisma/client";
import async from "async";
import dayjs from "dayjs";
import dayjsBusinessTime from "dayjs-business-days2";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest } from "next";
import rrule from "rrule";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import EventManager from "@calcom/core/EventManager";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import {
  sendAttendeeRequestEmail,
  sendOrganizerRequestEmail,
  sendRescheduledEmails,
  sendScheduledEmails,
} from "@calcom/emails";
import { getLuckyUsers, isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getDefaultEvent, getGroupName, getUsernameList } from "@calcom/lib/defaultEvents";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server";
import prisma, { userSelect } from "@calcom/prisma";
import { extendedBookingCreateBody } from "@calcom/prisma/zod-utils";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import { handlePayment } from "@ee/lib/stripe/server";

import { HttpError } from "@lib/core/http/error";
import { ensureArray } from "@lib/ensureArray";
import { getEventName } from "@lib/event";
import isOutOfBounds from "@lib/isOutOfBounds";
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

function isAvailable(busyTimes: BufferedBusyTimes, time: dayjs.ConfigType, length: number): boolean {
  // Check for conflicts
  let t = true;

  // Early return
  if (!Array.isArray(busyTimes) || busyTimes.length < 1) return t;

  let i = 0;
  while (t === true && i < busyTimes.length) {
    const busyTime = busyTimes[i];
    i++;
    const startTime = dayjs(busyTime.start);
    const endTime = dayjs(busyTime.end);

    // Check if time is between start and end times
    if (dayjs(time).isBetween(startTime, endTime, null, "[)")) {
      t = false;
      break;
    }

    // Check if slot end time is between start and end time
    if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
      t = false;
      break;
    }

    // Check if startTime is between slot
    if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
      t = false;
      break;
    }
  }

  return t;
}

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

const getEventTypesFromDB = async (eventTypeId: number) => {
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
      description: true,
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
      hideCalendarNotes: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      locations: true,
      timeZone: true,
      schedule: {
        select: {
          availability: true,
          timeZone: true,
        },
      },
      availability: {
        select: {
          startTime: true,
          endTime: true,
          days: true,
        },
      },
    },
  });

  return {
    ...eventType,
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
  };
};

type User = Prisma.UserGetPayload<typeof userSelect>;

async function handler(req: NextApiRequest) {
  const { recurringCount, noEmail, eventTypeSlug, eventTypeId, hasHashedBookingLink, language, ...reqBody } =
    extendedBookingCreateBody.parse(req.body);

  // handle dynamic user
  const dynamicUserList = Array.isArray(reqBody.user)
    ? getGroupName(reqBody.user)
    : getUsernameList(reqBody.user);
  const tAttendees = await getTranslation(language ?? "en", "common");
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
    throw new HttpError({ statusCode: 400, message: error.message });
  }

  const eventType = !eventTypeId ? getDefaultEvent(eventTypeSlug) : await getEventTypesFromDB(eventTypeId);
  if (!eventType) throw new HttpError({ statusCode: 404, message: "eventType.notFound" });

  let users = !eventTypeId
    ? await prisma.user.findMany({
        where: {
          username: {
            in: dynamicUserList,
          },
        },
        ...userSelect,
      })
    : eventType.users;

  /* If this event was pre-relationship migration */
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      ...userSelect,
    });
    if (!eventTypeUser) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    users.push(eventTypeUser);
  }
  const [organizerUser] = users;
  const organizer = await prisma.user.findUnique({
    where: {
      id: organizerUser.id,
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
      language: { translate: tAttendees, locale: language ?? "en" },
    },
  ];
  const guests = (reqBody.guests || []).map((guest) => ({
    email: guest,
    name: "",
    timeZone: reqBody.timeZone,
    language: { translate: tGuests, locale: "en" },
  }));

  // For seats, if the booking already exists then we want to add the new attendee to the existing booking
  if (reqBody.bookingUid) {
    if (!eventType.seatsPerTimeSlot)
      throw new HttpError({ statusCode: 404, message: "Event type does not have seats" });

    const booking = await prisma.booking.findUnique({
      where: {
        uid: reqBody.bookingUid,
      },
      include: {
        attendees: true,
      },
    });
    if (!booking) throw new HttpError({ statusCode: 404, message: "Booking not found" });

    if (eventType.seatsPerTimeSlot <= booking.attendees.length)
      throw new HttpError({ statusCode: 409, message: "Booking seats are full" });

    if (booking.attendees.some((attendee) => attendee.email === invitee[0].email))
      throw new HttpError({ statusCode: 409, message: "Already signed up for time slot" });

    await prisma.booking.update({
      where: {
        uid: reqBody.bookingUid,
      },
      data: {
        attendees: {
          create: {
            email: invitee[0].email,
            name: invitee[0].name,
            timeZone: invitee[0].timeZone,
            locale: invitee[0].language.locale,
          },
        },
      },
    });
    req.statusCode = 201;
    return booking;
  }

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

  const seed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  const location = !!eventType.locations ? (eventType.locations as Array<{ type: string }>)[0] : "";
  const locationType = !!location && location.type ? location.type : "";
  const eventNameObject = {
    attendeeName: reqBody.name || "Nameless",
    eventType: eventType.title,
    eventName: eventType.eventName,
    host: organizerUser.name || "Nameless",
    location: locationType,
    t: tOrganizer,
  };

  const additionalNotes = reqBody.notes;

  const customInputs = {} as NonNullable<CalendarEvent["customInputs"]>;

  if (reqBody.customInputs.length > 0) {
    reqBody.customInputs.forEach(({ label, value }) => {
      customInputs[label] = value;
    });
  }

  const evt: CalendarEvent = {
    type: eventType.title,
    title: getEventName(eventNameObject), //this needs to be either forced in english, or fetched for each attendee and organizer separately
    description: eventType.description,
    additionalNotes,
    customInputs,
    startTime: reqBody.start,
    endTime: reqBody.end,
    organizer: {
      name: organizerUser.name || "Nameless",
      email: organizerUser.email || "Email-less",
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizer?.locale ?? "en" },
    },
    attendees: attendeesList,
    location: reqBody.location, // Will be processed by the EventManager later.
    /** For team events & dynamic collective events, we will need to handle each member destinationCalendar eventually */
    destinationCalendar: eventType.destinationCalendar || organizerUser.destinationCalendar,
    hideCalendarNotes: eventType.hideCalendarNotes,
  };

  if (eventType.schedulingType === SchedulingType.COLLECTIVE) {
    evt.team = {
      members: users.map((user) => user.name || user.username || "Nameless"),
      name: eventType.team?.name || "Nameless",
    }; // used for invitee emails
  }

  if (reqBody.recurringEventId && eventType.recurringEvent) {
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    eventType.recurringEvent = Object.assign({}, eventType.recurringEvent, { count: recurringCount });
  }

  // Initialize EventManager with credentials
  const rescheduleUid = reqBody.rescheduleUid;
  async function getOriginalRescheduledBooking(uid: string) {
    return prisma.booking.findFirst({
      where: {
        uid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED],
        },
      },
      include: {
        attendees: {
          select: {
            name: true,
            email: true,
            locale: true,
            timeZone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            locale: true,
            timeZone: true,
          },
        },
        payment: true,
      },
    });
  }
  type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
  let originalRescheduledBooking: BookingType = null;
  if (rescheduleUid) {
    originalRescheduledBooking = await getOriginalRescheduledBooking(rescheduleUid);
  }

  async function createBooking() {
    // @TODO: check as metadata
    if (reqBody.web3Details) {
      const { web3Details } = reqBody;
      await verifyAccount(web3Details.userSignature, web3Details.userWallet);
    }

    if (originalRescheduledBooking) {
      evt.title = originalRescheduledBooking?.title || evt.title;
      evt.description = originalRescheduledBooking?.description || evt.additionalNotes;
      evt.location = originalRescheduledBooking?.location;
    }

    const eventTypeRel = !eventTypeId
      ? {}
      : {
          connect: {
            id: eventTypeId,
          },
        };

    const dynamicEventSlugRef = !eventTypeId ? eventTypeSlug : null;
    const dynamicGroupSlugRef = !eventTypeId ? (reqBody.user as string).toLowerCase() : null;
    const isConfirmedByDefault = (!eventType.requiresConfirmation && !eventType.price) || !!rescheduleUid;
    const newBookingData: Prisma.BookingCreateInput = {
      uid,
      title: evt.title,
      startTime: dayjs(evt.startTime).toDate(),
      endTime: dayjs(evt.endTime).toDate(),
      description: evt.additionalNotes,
      customInputs: isPrismaObjOrUndefined(evt.customInputs),
      status: isConfirmedByDefault ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
      location: evt.location,
      eventType: eventTypeRel,
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
      dynamicEventSlugRef,
      dynamicGroupSlugRef,
      user: {
        connect: {
          id: organizerUser.id,
        },
      },
      destinationCalendar: evt.destinationCalendar
        ? {
            connect: { id: evt.destinationCalendar.id },
          }
        : undefined,
    };
    if (reqBody.recurringEventId) {
      newBookingData.recurringEventId = reqBody.recurringEventId;
    }
    if (originalRescheduledBooking) {
      newBookingData["paid"] = originalRescheduledBooking.paid;
      newBookingData["fromReschedule"] = originalRescheduledBooking.uid;
      if (newBookingData.attendees?.createMany?.data) {
        newBookingData.attendees.createMany.data = originalRescheduledBooking.attendees;
      }
    }
    const createBookingObj = {
      include: {
        user: {
          select: { email: true, name: true, timeZone: true },
        },
        attendees: true,
        payment: true,
      },
      data: newBookingData,
    };

    if (originalRescheduledBooking?.paid && originalRescheduledBooking?.payment) {
      const bookingPayment = originalRescheduledBooking?.payment?.find((payment) => payment.success);

      if (bookingPayment) {
        createBookingObj.data.payment = {
          connect: { id: bookingPayment.id },
        };
      }
    }

    if (typeof eventType.price === "number" && eventType.price > 0) {
      /* Validate if there is any stripe_payment credential for this user */
      await prisma.credential.findFirst({
        rejectOnNotFound(err) {
          throw new HttpError({ statusCode: 400, message: "Missing stripe credentials", cause: err });
        },
        where: {
          type: "stripe_payment",
          userId: organizerUser.id,
        },
        select: {
          id: true,
        },
      });
    }

    return prisma.booking.create(createBookingObj);
  }

  let results: EventResult[] = [];
  let referencesToCreate: PartialReference[] = [];
  let user: User | null = null;

  /** Let's start checking for availability */
  for (const currentUser of users) {
    if (!currentUser) {
      console.error(`currentUser not found`);
      continue;
    }
    if (!user) user = currentUser;

    const { busy: bufferedBusyTimes } = await getUserAvailability(
      {
        userId: currentUser.id,
        dateFrom: reqBody.start,
        dateTo: reqBody.end,
        eventTypeId,
      },
      { user, eventType }
    );

    console.log("calendarBusyTimes==>>>", bufferedBusyTimes);

    let isAvailableToBeBooked = true;
    try {
      if (eventType.recurringEvent) {
        const recurringEvent = parseRecurringEvent(eventType.recurringEvent);
        const allBookingDates = new rrule({ dtstart: new Date(reqBody.start), ...recurringEvent }).all();
        // Go through each date for the recurring event and check if each one's availability
        // DONE: Decreased computational complexity from O(2^n) to O(n) by refactoring this loop to stop
        // running at the first unavailable time.
        let i = 0;
        while (isAvailableToBeBooked === true && i < allBookingDates.length) {
          const aDate = allBookingDates[i];
          i++;
          isAvailableToBeBooked = isAvailable(bufferedBusyTimes, aDate, eventType.length);
          /* We bail at the first false, we don't need to keep checking */
          if (!isAvailableToBeBooked) break;
        }
      } else {
        isAvailableToBeBooked = isAvailable(bufferedBusyTimes, reqBody.start, eventType.length);
      }
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
      throw new HttpError({ statusCode: 409, message: error.message });
    }

    let timeOutOfBounds = false;

    try {
      timeOutOfBounds = isOutOfBounds(reqBody.start, {
        periodType: eventType.periodType,
        periodDays: eventType.periodDays,
        periodEndDate: eventType.periodEndDate,
        periodStartDate: eventType.periodStartDate,
        periodCountCalendarDays: eventType.periodCountCalendarDays,
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
      throw new HttpError({ statusCode: 409, message: error.message });
    }
  }

  type Booking = Prisma.PromiseReturnType<typeof createBooking>;
  let booking: Booking | null = null;
  try {
    booking = await createBooking();
    evt.uid = booking?.uid ?? null;
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Booking ${eventTypeId} failed`, "Error when saving booking to db", err.message);
    if (err.code === "P2002") {
      throw new HttpError({ statusCode: 409, message: "booking.conflict" });
    }
    throw err;
  }

  if (!user) throw new HttpError({ statusCode: 404, message: "Can't continue, user not found." });

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(user.credentials);
  const eventManager = new EventManager({ ...user, credentials });

  if (originalRescheduledBooking?.uid) {
    // Use EventManager to conditionally use all needed integrations.
    const updateManager = await eventManager.update(
      evt,
      originalRescheduledBooking.uid,
      booking?.id,
      reqBody.rescheduleReason
    );
    // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = updateManager.results;
    referencesToCreate = updateManager.referencesToCreate;
    if (results.length > 0 && results.some((res) => !res.success)) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      log.error(`Booking ${user.name} failed`, error, results);
    } else {
      const metadata: AdditionalInformation = {};

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

      if (noEmail !== true) {
        await sendRescheduledEmails({
          ...evt,
          additionalInformation: metadata,
          additionalNotes, // Resets back to the additionalNote input and not the override value
          cancellationReason: reqBody.rescheduleReason,
        });
      }
    }
    // If it's not a reschedule, doesn't require confirmation and there's no price,
    // Create a booking
  } else if (!eventType.requiresConfirmation && !eventType.price) {
    // Use EventManager to conditionally use all needed integrations.
    const createManager = await eventManager.create(evt);

    // This gets overridden when creating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = createManager.results;
    referencesToCreate = createManager.referencesToCreate;
    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      log.error(`Booking ${user.username} failed`, error, results);
    } else {
      const metadata: AdditionalInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
      }
      if (noEmail !== true) {
        await sendScheduledEmails({
          ...evt,
          additionalInformation: metadata,
          additionalNotes,
          customInputs,
        });
      }
    }
  }

  if (eventType.requiresConfirmation && !rescheduleUid && noEmail !== true) {
    await sendOrganizerRequestEmail({ ...evt, additionalNotes });
    await sendAttendeeRequestEmail({ ...evt, additionalNotes }, attendeesList[0]);
  }

  if (
    !Number.isNaN(eventType.price) &&
    eventType.price > 0 &&
    !originalRescheduledBooking?.paid &&
    !!booking
  ) {
    const [firstStripeCredential] = user.credentials.filter((cred) => cred.type == "stripe_payment");

    if (!firstStripeCredential)
      throw new HttpError({ statusCode: 400, message: "Missing payment credentials" });

    if (!booking.user) booking.user = user;
    const payment = await handlePayment(evt, eventType, firstStripeCredential, booking);

    req.statusCode = 201;
    return { ...booking, message: "Payment required", paymentUid: payment.uid };
  }

  log.debug(`Booking ${user.username} completed`);

  const eventTrigger: WebhookTriggerEvents = rescheduleUid ? "BOOKING_RESCHEDULED" : "BOOKING_CREATED";
  const subscriberOptions = {
    userId: user.id,
    eventTypeId,
    triggerEvent: eventTrigger,
  };

  // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
  const subscribers = await getSubscribers(subscriberOptions);
  console.log("evt:", {
    ...evt,
    metadata: reqBody.metadata,
  });
  const promises = subscribers.map((sub) =>
    sendPayload(eventTrigger, new Date().toISOString(), sub, {
      ...evt,
      rescheduleUid,
      metadata: reqBody.metadata,
    }).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);
  // Avoid passing referencesToCreate with id unique constrain values
  // refresh hashed link if used
  const urlSeed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}`;
  const hashedUid = translator.fromUUID(uuidv5(urlSeed, uuidv5.URL));

  if (hasHashedBookingLink) {
    await prisma.hashedLink.update({
      where: {
        link: reqBody.hashedLink as string,
      },
      data: {
        link: hashedUid,
      },
    });
  }
  if (!booking) throw new HttpError({ statusCode: 400, message: "Booking failed" });
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
  req.statusCode = 201;
  return booking;
}

export default defaultResponder(handler);
