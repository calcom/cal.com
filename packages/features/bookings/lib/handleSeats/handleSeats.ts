// eslint-disable-next-line no-restricted-imports
import { scheduleWorkflowReminders } from "@calid/features/modules/workflows/utils/reminderScheduler";
import { uuid } from "short-uuid";

import dayjs from "@calcom/dayjs";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { findBookingQuery } from "../handleNewBooking/findBookingQuery";
import { createLoggerWithEventDetails } from "../handleNewBooking/logger";
import type { IEventTypePaymentCredentialType } from "../handleNewBooking/types";
import createNewSeat from "./create/createNewSeat";
import rescheduleSeatedBooking from "./reschedule/rescheduleSeatedBooking";
import type { NewSeatedBookingObject, SeatedBooking, HandleSeatsResultBooking } from "./types";

const handleSeats = async (newSeatedBookingObject: NewSeatedBookingObject) => {
  const {
    eventType,

    isConfirmedByDefault,
    reqBodyUser,
    noPaymentRequired,
    rescheduleUid,
    reqBookingUid,
    invitee,
    bookerEmail,
    bookerPhoneNumber,
    smsReminderNumber,
    eventTypeInfo,
    uid,
    originalRescheduledBooking,
    reqBodyMetadata,
    eventTypeId,
    subscriberOptions,
    eventTrigger,
    evt,
    workflows,
    rescheduledBy,
    rescheduleReason,
    isDryRun = false,
  } = newSeatedBookingObject;
  // TODO: We could allow doing more things to support good dry run for seats
  if (isDryRun) return;
  const loggerWithEventDetails = createLoggerWithEventDetails(eventType.id, reqBodyUser, eventType.slug);

  let resultBooking: HandleSeatsResultBooking = null;

  const seatedBooking: SeatedBooking | null = await prisma.booking.findFirst({
    where: {
      OR: [
        {
          uid: rescheduleUid || reqBookingUid,
        },

        {
          eventTypeId: eventType.id,
          startTime: new Date(evt.startTime),
        },
      ],
      status: BookingStatus.ACCEPTED,
    },
    select: {
      uid: true,
      id: true,
      attendees: { include: { bookingSeat: { include: { payment: true } } } },
      userId: true,
      references: true,
      startTime: true,
      user: true,
      status: true,
      smsReminderNumber: true,
      endTime: true,
    },
  });

  if (!seatedBooking && rescheduleUid) {
    throw new HttpError({ statusCode: 404, message: ErrorCode.BookingNotFound });
  }

  // We might be trying to create a new booking
  if (!seatedBooking) {
    return;
  }

  const bookingRepo = new BookingRepository(prisma);

  const existingBooking = await bookingRepo.getValidBookingFromEventTypeForAttendee({
    eventTypeId,
    bookerEmail,
    bookerPhoneNumber: bookerPhoneNumber ?? undefined,
    startTime: new Date(dayjs(seatedBooking.startTime).utc().format()),
  });

  const existingBookingSeat = await prisma.bookingSeat.findFirst({
    where: {
      bookingId: seatedBooking.id,
      attendee: {
        OR: [{ email: bookerEmail }, bookerPhoneNumber ? { phoneNumber: bookerPhoneNumber } : {}],
      },
    },
    include: {
      attendee: true,
    },
  });

  // See if attendee is already signed up for timeslot
  if (existingBooking && noPaymentRequired) {
    throw new HttpError({ statusCode: 409, message: ErrorCode.AlreadySignedUpForBooking });
  }

  // There are three paths here, booking seat already exists, reschedule a booking with seats and booking seats without reschedule

  if (rescheduleUid) {
    resultBooking = await rescheduleSeatedBooking(
      // Assert that the rescheduleUid is defined
      { ...newSeatedBookingObject, rescheduleUid },
      seatedBooking,
      resultBooking,
      loggerWithEventDetails
    );
  } else if (existingBookingSeat) {
    const foundBooking = await findBookingQuery(seatedBooking.id);
    resultBooking = { ...foundBooking, seatReferenceUid: existingBookingSeat.referenceUid };
  } else {
    evt.attendeeSeatId = uuid();
    evt.uid = seatedBooking.uid;
    resultBooking = await createNewSeat(newSeatedBookingObject, seatedBooking, reqBodyMetadata);
  }

  const payment = await handleSeatPayment({
    resultBooking,
    rescheduleSeatedBookingObject: newSeatedBookingObject,
    seatedBooking,
  });

  const paymentLink = isPrismaObjOrUndefined(payment?.data)?.paymentLink as string;

  // If the resultBooking is defined we should trigger workflows else, trigger in handleNewBooking
  if (resultBooking) {
    if (payment) {
      resultBooking["message"] = "Payment required";
    }
    resultBooking["paymentUid"] = payment?.uid;
    resultBooking["id"] = payment?.id;
    resultBooking["paymentLink"] = paymentLink;

    const metadata = {
      ...(typeof resultBooking.metadata === "object" && resultBooking.metadata),
      ...reqBodyMetadata,
    };
    try {
      // If there is an existing booking seat, we have already scheduled the reminders
      if (!existingBookingSeat) {
        await scheduleWorkflowReminders({
          workflows,
          smsReminderNumber: smsReminderNumber || null,
          calendarEvent: {
            ...evt,
            // rescheduleReason,
            ...{
              metadata,
              eventType: {
                slug: eventType.slug,
                schedulingType: eventType.schedulingType,
                hosts: eventType.hosts,
              },
            },
          },
          isNotConfirmed: evt.requiresConfirmation || false,
          isRescheduleEvent: !!rescheduleUid,
          isFirstRecurringEvent: true,
          emailAttendeeSendToOverride: bookerEmail,
          seatReferenceUid: evt.attendeeSeatId,
          // isDryRun,
        });
      }
    } catch (error) {
      loggerWithEventDetails.error("Error while scheduling workflow reminders", JSON.stringify({ error }));
    }

    const webhookData: EventPayloadType = {
      ...evt,
      ...eventTypeInfo,
      uid: resultBooking?.uid || uid,
      bookingId: seatedBooking?.id,
      attendeeSeatId: resultBooking?.seatReferenceUid,
      rescheduleUid,
      rescheduleStartTime: originalRescheduledBooking?.startTime
        ? dayjs(originalRescheduledBooking?.startTime).utc().format()
        : undefined,
      rescheduleEndTime: originalRescheduledBooking?.endTime
        ? dayjs(originalRescheduledBooking?.endTime).utc().format()
        : undefined,
      metadata,
      eventTypeId,
      status: "ACCEPTED",
      smsReminderNumber: seatedBooking?.smsReminderNumber || undefined,
      rescheduledBy,
    };

    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun });
  }

  return resultBooking;
};

async function handleSeatPayment({
  resultBooking,
  rescheduleSeatedBookingObject,
  seatedBooking,
}: {
  rescheduleSeatedBookingObject: any;
  seatedBooking: SeatedBooking;
  resultBooking: HandleSeatsResultBooking;
}) {
  if (!resultBooking || !resultBooking!["seatReferenceUid"]) {
    return;
  }

  const { eventType, fullName, paymentAppData, bookerEmail, responses, bookerPhoneNumber, organizerUser } =
    rescheduleSeatedBookingObject;

  let { evt } = rescheduleSeatedBookingObject;

  if (!Number.isNaN(paymentAppData.price) && paymentAppData.price > 0 && !!seatedBooking) {
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
        app: {
          categories: {
            hasSome: ["payment"],
          },
        },
      },
      select: {
        key: true,
        appId: true,
        app: {
          select: {
            categories: true,
            dirName: true,
          },
        },
      },
    });

    const eventTypePaymentAppCredential = credentialPaymentAppCategories.find((credential) => {
      return credential.appId === paymentAppData.appId;
    });

    if (!eventTypePaymentAppCredential) {
      throw new HttpError({ statusCode: 400, message: ErrorCode.MissingPaymentCredential });
    }
    if (!eventTypePaymentAppCredential?.appId) {
      throw new HttpError({ statusCode: 400, message: ErrorCode.MissingPaymentAppId });
    }

    const bookingSeat = await prisma.bookingSeat.findUnique({
      where: {
        referenceUid: resultBooking!["seatReferenceUid"] ?? evt.attendeeSeatId,
      },
      select: {
        id: true,
      },
    });

    if (!bookingSeat) {
      throw new HttpError({ statusCode: 404, message: ErrorCode.BookingNotFound });
    }

    const payment = await handlePayment({
      evt,
      selectedEventType: eventType,
      paymentAppCredentials: eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      booking: seatedBooking,
      bookerName: fullName,
      bookerEmail,
      bookerPhoneNumber,
      bookingSeat: {
        id: bookingSeat.id,
      },
      responses,
    });

    return payment;
  }

  return null;
}

export default handleSeats;
