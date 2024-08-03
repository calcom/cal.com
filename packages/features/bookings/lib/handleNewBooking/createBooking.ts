import { Prisma } from "@prisma/client";
import type short from "short-uuid";

import dayjs from "@calcom/dayjs";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { TgetBookingDataSchema } from "../getBookingDataSchema";
import type {
  EventTypeId,
  AwaitedBookingData,
  NewBookingEventType,
  IsConfirmedByDefault,
  PaymentAppData,
  OriginalRescheduledBooking,
  AwaitedLoadUsers,
} from "./types";

type ReqBodyWithEnd = TgetBookingDataSchema & { end: string };

type CreateBookingParams = {
  originalRescheduledBooking: OriginalRescheduledBooking;
  evt: CalendarEvent;
  eventType: NewBookingEventType;
  eventTypeId: EventTypeId;
  eventTypeSlug: AwaitedBookingData["eventTypeSlug"];
  reqBodyUser: ReqBodyWithEnd["user"];
  reqBodyMetadata: ReqBodyWithEnd["metadata"];
  reqBodyRecurringEventId: ReqBodyWithEnd["recurringEventId"];
  uid: short.SUUID;
  responses: ReqBodyWithEnd["responses"] | null;
  isConfirmedByDefault: IsConfirmedByDefault;
  smsReminderNumber: AwaitedBookingData["smsReminderNumber"];
  organizerUser: AwaitedLoadUsers[number] & {
    isFixed?: boolean;
    metadata?: Prisma.JsonValue;
  };
  rescheduleReason: AwaitedBookingData["rescheduleReason"];
  bookerEmail: AwaitedBookingData["email"];
  paymentAppData: PaymentAppData;
  changedOrganizer: boolean;
};

function updateEventDetails(
  evt: CalendarEvent,
  originalRescheduledBooking: OriginalRescheduledBooking | null,
  changedOrganizer: boolean
) {
  if (originalRescheduledBooking) {
    evt.title = originalRescheduledBooking?.title || evt.title;
    evt.description = originalRescheduledBooking?.description || evt.description;
    evt.location = originalRescheduledBooking?.location || evt.location;
    evt.location = changedOrganizer ? evt.location : originalRescheduledBooking?.location || evt.location;
  }
}

export async function createBooking({
  originalRescheduledBooking,
  evt,
  eventTypeId,
  eventTypeSlug,
  reqBodyUser,
  reqBodyMetadata,
  reqBodyRecurringEventId,
  uid,
  responses,
  isConfirmedByDefault,
  smsReminderNumber,
  organizerUser,
  rescheduleReason,
  eventType,
  bookerEmail,
  paymentAppData,
  changedOrganizer,
}: CreateBookingParams) {
  updateEventDetails(evt, originalRescheduledBooking, changedOrganizer);

  const newBookingData = buildNewBookingData({
    uid,
    evt,
    responses,
    isConfirmedByDefault,
    reqBodyMetadata,
    smsReminderNumber,
    eventTypeSlug,
    organizerUser,
    reqBodyRecurringEventId,
    originalRescheduledBooking,
    bookerEmail,
    rescheduleReason,
    eventType,
    eventTypeId,
    reqBodyUser,
  });

  return await saveBooking(newBookingData, originalRescheduledBooking, paymentAppData, organizerUser);
}

async function saveBooking(
  newBookingData: Prisma.BookingCreateInput,
  originalRescheduledBooking: OriginalRescheduledBooking,
  paymentAppData: PaymentAppData,
  organizerUser: CreateBookingParams["organizerUser"]
) {
  const createBookingObj = {
    include: {
      user: {
        select: { email: true, name: true, timeZone: true, username: true },
      },
      attendees: true,
      payment: true,
      references: true,
    },
    data: newBookingData,
  };

  if (originalRescheduledBooking?.paid && originalRescheduledBooking?.payment) {
    const bookingPayment = originalRescheduledBooking.payment.find((payment) => payment.success);
    if (bookingPayment) {
      createBookingObj.data.payment = { connect: { id: bookingPayment.id } };
    }
  }

  if (typeof paymentAppData.price === "number" && paymentAppData.price > 0) {
    await prisma.credential.findFirstOrThrow({
      where: {
        appId: paymentAppData.appId,
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
      },
      select: { id: true },
    });
  }

  return prisma.booking.create(createBookingObj);
}

function getEventTypeRel(eventTypeId: EventTypeId) {
  return eventTypeId ? { connect: { id: eventTypeId } } : {};
}

function getAttendeesData(evt: Pick<CalendarEvent, "attendees" | "team">) {
  //if attendee is team member, it should fetch their locale not booker's locale
  //perhaps make email fetch request to see if his locale is stored, else
  const attendees = evt.attendees.map((attendee) => ({
    name: attendee.name,
    email: attendee.email,
    timeZone: attendee.timeZone,
    locale: attendee.language.locale,
  }));

  if (evt.team?.members) {
    attendees.push(
      ...evt.team.members.map((member) => ({
        email: member.email,
        name: member.name,
        timeZone: member.timeZone,
        locale: member.language.locale,
      }))
    );
  }

  return attendees;
}

function buildNewBookingData(params: {
  uid: short.SUUID;
  evt: CalendarEvent;
  responses: ReqBodyWithEnd["responses"] | null;
  isConfirmedByDefault: IsConfirmedByDefault;
  reqBodyMetadata: ReqBodyWithEnd["metadata"];
  smsReminderNumber: AwaitedBookingData["smsReminderNumber"];
  eventTypeSlug: AwaitedBookingData["eventTypeSlug"];
  organizerUser: CreateBookingParams["organizerUser"];
  reqBodyRecurringEventId: ReqBodyWithEnd["recurringEventId"];
  originalRescheduledBooking: OriginalRescheduledBooking | null;
  bookerEmail: AwaitedBookingData["email"];
  rescheduleReason: AwaitedBookingData["rescheduleReason"];
  eventType: NewBookingEventType;
  eventTypeId: EventTypeId;
  reqBodyUser: ReqBodyWithEnd["user"];
}): Prisma.BookingCreateInput {
  const {
    uid,
    evt,
    responses,
    isConfirmedByDefault,
    reqBodyMetadata,
    smsReminderNumber,
    eventTypeSlug,
    organizerUser,
    reqBodyRecurringEventId,
    originalRescheduledBooking,
    bookerEmail,
    rescheduleReason,
    eventType,
    eventTypeId,
    reqBodyUser,
  } = params;

  const attendeesData = getAttendeesData(evt);
  const eventTypeRel = getEventTypeRel(eventTypeId);

  const newBookingData: Prisma.BookingCreateInput = {
    uid,
    userPrimaryEmail: evt.organizer.email,
    responses: responses === null || evt.seatsPerTimeSlot ? Prisma.JsonNull : responses,
    title: evt.title,
    startTime: dayjs.utc(evt.startTime).toDate(),
    endTime: dayjs.utc(evt.endTime).toDate(),
    description: evt.seatsPerTimeSlot ? null : evt.additionalNotes,
    customInputs: isPrismaObjOrUndefined(evt.customInputs),
    status: isConfirmedByDefault ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
    location: evt.location,
    eventType: eventTypeRel,
    smsReminderNumber,
    metadata: reqBodyMetadata,
    attendees: {
      createMany: {
        data: attendeesData,
      },
    },
    dynamicEventSlugRef: !eventTypeId ? eventTypeSlug : null,
    dynamicGroupSlugRef: !eventTypeId ? (reqBodyUser as string).toLowerCase() : null,
    iCalUID: evt.iCalUID ?? "",
    user: {
      connect: {
        id: organizerUser.id,
      },
    },
    destinationCalendar:
      evt.destinationCalendar && evt.destinationCalendar.length > 0
        ? {
            connect: { id: evt.destinationCalendar[0].id },
          }
        : undefined,
  };

  if (reqBodyRecurringEventId) {
    newBookingData.recurringEventId = reqBodyRecurringEventId;
  }

  if (originalRescheduledBooking) {
    newBookingData.metadata = {
      ...(typeof originalRescheduledBooking.metadata === "object" && originalRescheduledBooking.metadata),
    };
    newBookingData.paid = originalRescheduledBooking.paid;
    newBookingData.fromReschedule = originalRescheduledBooking.uid;
    if (originalRescheduledBooking.uid) {
      newBookingData.cancellationReason = rescheduleReason;
    }
    // Reschedule logic with booking with seats
    if (newBookingData.attendees?.createMany?.data && eventType?.seatsPerTimeSlot && bookerEmail) {
      newBookingData.attendees.createMany.data = attendeesData.filter(
        (attendee) => attendee.email === bookerEmail
      );
    }
    if (originalRescheduledBooking.recurringEventId) {
      newBookingData.recurringEventId = originalRescheduledBooking.recurringEventId;
    }
  }

  return newBookingData;
}

export type Booking = Prisma.PromiseReturnType<typeof createBooking>;
