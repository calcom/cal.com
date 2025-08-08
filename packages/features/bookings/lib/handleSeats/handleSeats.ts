// eslint-disable-next-line no-restricted-imports
import dayjs from "@calcom/dayjs";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

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
  } = newSeatedBookingObject;
  // TODO: We could allow doing more things to support good dry run for seats
  if (isDryRun) return;
  const loggerWithEventDetails = createLoggerWithEventDetails(eventType.id, reqBodyUser, eventType.slug);

  let resultBooking: HandleSeatsResultBooking = null;

  let shouldCreateSeparateBooking = false;
  
  if (eventType.schedulingType === SchedulingType.ROUND_ROBIN && eventType.seatsPerTimeSlot && !rescheduleUid && !reqBookingUid) {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        eventTypeId: eventType.id,
        startTime: new Date(evt.startTime),
        status: BookingStatus.ACCEPTED,
      },
      select: {
        userId: true,
        _count: { select: { attendees: true } },
      },
    });

    if (existingBooking) {
      const currentAttendeeCount = existingBooking._count?.attendees || 0;
      const hasAvailableSeats = currentAttendeeCount < (eventType.seatsPerTimeSlot || 0);
      
      if (!hasAvailableSeats && existingBooking.userId !== evt.organizer.id) {
        shouldCreateSeparateBooking = true;
      } else if (existingBooking.userId !== evt.organizer.id) {
        shouldCreateSeparateBooking = true;
      }
    }
  }

  const seatedBooking: SeatedBooking | null = shouldCreateSeparateBooking ? null : await prisma.booking.findFirst({
    where: {
      OR: [
        {
          uid: rescheduleUid || reqBookingUid,
        },

        {
          eventTypeId: eventType.id,
          startTime: new Date(evt.startTime),
          ...(eventType.schedulingType === SchedulingType.ROUND_ROBIN ? { userId: evt.organizer.id } : {}),
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

  // There are two paths here, reschedule a booking with seats and booking seats without reschedule
  if (rescheduleUid) {
    resultBooking = await rescheduleSeatedBooking(
      // Assert that the rescheduleUid is defined
      { ...newSeatedBookingObject, rescheduleUid },
      seatedBooking,
      resultBooking,
      loggerWithEventDetails
    );
  } else {
    resultBooking = await createNewSeat(newSeatedBookingObject, seatedBooking, reqBodyMetadata);
  }

  // If the resultBooking is defined we should trigger workflows else, trigger in handleNewBooking
  if (resultBooking) {
    const metadata = {
      ...(typeof resultBooking.metadata === "object" && resultBooking.metadata),
      ...reqBodyMetadata,
    };
    try {
      await scheduleWorkflowReminders({
        workflows,
        smsReminderNumber: smsReminderNumber || null,
        calendarEvent: {
          ...evt,
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
        isNotConfirmed: evt.requiresConfirmation || false,
        isRescheduleEvent: !!rescheduleUid,
        isFirstRecurringEvent: true,
        emailAttendeeSendToOverride: bookerEmail,
        seatReferenceUid: evt.attendeeSeatId,
        isDryRun,
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
      smsReminderNumber: seatedBooking?.smsReminderNumber || undefined,
      rescheduledBy,
    };

    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun });
  }

  return resultBooking;
};

export default handleSeats;
