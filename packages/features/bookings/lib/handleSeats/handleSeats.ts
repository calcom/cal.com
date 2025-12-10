import dayjs from "@calcom/dayjs";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { makeAttendeeActor, makeGuestActor, makeUserActor } from "../types/actor";

import { createLoggerWithEventDetails } from "../handleNewBooking/logger";
import createNewSeat from "./create/createNewSeat";
import rescheduleSeatedBooking from "./reschedule/rescheduleSeatedBooking";
import type { NewSeatedBookingObject, SeatedBooking, HandleSeatsResultBooking } from "./types";

const handleSeats = async (newSeatedBookingObject: NewSeatedBookingObject) => {
  const {
    eventType,
    reqBodyUser,
    rescheduleUid,
    reqBookingUid,
    invitee,
    bookerEmail,
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
    bookingEventHandler,
    organizationId,
    reqUserId,
    fullName,
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
      attendees: { include: { bookingSeat: true } },
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

  // See if attendee is already signed up for timeslot
  if (
    seatedBooking.attendees.find((attendee) => {
      return attendee.email === invitee[0].email;
    }) &&
    dayjs.utc(seatedBooking.startTime).format() === evt.startTime
  ) {
    throw new HttpError({ statusCode: 409, message: ErrorCode.AlreadySignedUpForBooking });
  }

  // Helper function to get audit actor
  const getAuditActor = async (): Promise<import("../types/actor").Actor> => {
    if (reqUserId) {
      const user = await prisma.user.findUnique({
        where: { id: reqUserId },
        select: { uuid: true },
      });
      if (user?.uuid) {
        return makeUserActor(user.uuid);
      }
    }

    // Try to find attendee by email in the booking
    const attendee = await prisma.attendee.findFirst({
      where: {
        bookingId: seatedBooking.id,
        email: bookerEmail,
      },
      select: { id: true },
    });

    if (attendee) {
      return makeAttendeeActor(attendee.id);
    }

    // Fallback to guest actor
    return makeGuestActor({ email: bookerEmail, name: fullName });
  };

  // Determine action source (WEBAPP or API_V2)
  // For now, defaulting to WEBAPP - can be enhanced later if needed
  const actionSource: "WEBAPP" | "API_V2" = "WEBAPP";

  // There are two paths here, reschedule a booking with seats and booking seats without reschedule
  if (rescheduleUid) {
    resultBooking = await rescheduleSeatedBooking(
      // Assert that the rescheduleUid is defined
      { ...newSeatedBookingObject, rescheduleUid },
      seatedBooking,
      resultBooking,
      loggerWithEventDetails
    );

    // Log SEAT_RESCHEDULED audit event
    if (bookingEventHandler && resultBooking && originalRescheduledBooking) {
      const auditActor = await getAuditActor();
      const seatReferenceUid = resultBooking.seatReferenceUid;
      if (seatReferenceUid) {
        // Determine if seat moved to a different booking (different time slot)
        const movedToDifferentBooking = resultBooking.uid && resultBooking.uid !== seatedBooking.uid;
        const newBookingStartTime = movedToDifferentBooking && resultBooking.startTime
          ? new Date(resultBooking.startTime).toISOString()
          : seatedBooking.startTime.toISOString();
        const newBookingEndTime = movedToDifferentBooking && resultBooking.endTime
          ? new Date(resultBooking.endTime).toISOString()
          : seatedBooking.endTime.toISOString();

        await bookingEventHandler.onSeatRescheduled(
          seatedBooking.uid,
          auditActor,
          organizationId ?? null,
          {
            seatReferenceUid,
            attendeeEmail: bookerEmail,
            startTime: {
              old: originalRescheduledBooking.startTime.toISOString(),
              new: newBookingStartTime,
            },
            endTime: {
              old: originalRescheduledBooking.endTime.toISOString(),
              new: newBookingEndTime,
            },
            rescheduledToBookingUid: {
              old: null,
              new: movedToDifferentBooking ? (resultBooking.uid || null) : null,
            },
            source: actionSource,
          },
          actionSource
        );
      }
    }
  } else {
    resultBooking = await createNewSeat(newSeatedBookingObject, seatedBooking, reqBodyMetadata);

    // Log SEAT_BOOKED audit event
    if (bookingEventHandler && resultBooking) {
      const auditActor = await getAuditActor();
      const seatReferenceUid = resultBooking.seatReferenceUid;
      if (seatReferenceUid) {
        await bookingEventHandler.onSeatBooked(
          seatedBooking.uid,
          auditActor,
          organizationId ?? null,
          {
            seatReferenceUid,
            attendeeEmail: bookerEmail,
            attendeeName: fullName || bookerEmail,
            startTime: seatedBooking.startTime.getTime(),
            endTime: seatedBooking.endTime.getTime(),
            source: actionSource,
          },
          actionSource
        );
      }
    }
  }

  // If the resultBooking is defined we should trigger workflows else, trigger in handleNewBooking
  if (resultBooking) {
    const metadata = {
      ...(typeof resultBooking.metadata === "object" && resultBooking.metadata),
      ...reqBodyMetadata,
    };
    // For seated events, use the phone number from the specific attendee being added
    const attendeePhoneNumber = invitee[0]?.phoneNumber || smsReminderNumber || null;
    try {
      const creditService = new CreditService();

      await WorkflowService.scheduleWorkflowsForNewBooking({
        workflows: workflows,
        smsReminderNumber: attendeePhoneNumber,
        calendarEvent: {
          ...evt,
          uid: seatedBooking.uid,
          rescheduleReason,
          ...{
            metadata,
            eventType: {
              slug: eventType.slug,
              schedulingType: eventType.schedulingType,
              hosts: eventType.hosts,
            },
          },
        },
        emailAttendeeSendToOverride: bookerEmail,
        seatReferenceUid: resultBooking?.seatReferenceUid,
        isDryRun,
        isConfirmedByDefault: !evt.requiresConfirmation,
        isRescheduleEvent: !!rescheduleUid,
        isNormalBookingOrFirstRecurringSlot: true,
        creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
      });
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
      smsReminderNumber: attendeePhoneNumber || undefined,
      rescheduledBy,
    };

    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun });
  }

  return resultBooking;
};

export default handleSeats;
