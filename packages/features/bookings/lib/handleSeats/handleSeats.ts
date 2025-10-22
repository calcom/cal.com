import dayjs from "@calcom/dayjs";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import createNewSeat from "./create/createNewSeat";
import rescheduleSeatedBooking from "./reschedule/rescheduleSeatedBooking";
import type { NewSeatedBookingObject, SeatedBooking, HandleSeatsResultBooking } from "./types";

const handleSeats = async (
  newSeatedBookingObject: NewSeatedBookingObject & { traceContext?: TraceContext }
) => {
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
    traceContext,
  } = newSeatedBookingObject;
  // TODO: We could allow doing more things to support good dry run for seats
  if (isDryRun) return;
  const seatsMeta = {
    eventTypeId: eventType.id.toString(),
    userInfo: JSON.stringify(reqBodyUser) || "null",
    eventTypeSlug: eventType.slug || "unknown",
    bookingUid: reqBookingUid || "null",
    rescheduleUid: rescheduleUid || "null",
  };

  const spanContext = traceContext
    ? distributedTracing.createSpan(traceContext, "handle_seats", seatsMeta)
    : distributedTracing.createTrace("handle_seats_fallback", {
        meta: seatsMeta,
      });

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);

  tracingLogger.info("Processing seated booking", {
    eventTypeId,
    eventTypeSlug: eventType.slug,
    rescheduleUid,
    reqBookingUid,
    bookerEmail,
    hasOriginalRescheduledBooking: !!originalRescheduledBooking,
    isReschedule: !!rescheduleUid,
    originalTraceId: traceContext?.traceId,
  });

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

  // There are two paths here, reschedule a booking with seats and booking seats without reschedule
  if (rescheduleUid) {
    resultBooking = await rescheduleSeatedBooking(
      // Assert that the rescheduleUid is defined
      { ...newSeatedBookingObject, rescheduleUid },
      seatedBooking,
      resultBooking,
      spanContext
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
      await WorkflowService.scheduleWorkflowsForNewBooking({
        workflows: workflows,
        smsReminderNumber: smsReminderNumber || null,
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
        traceContext: spanContext,
      });
    } catch (error) {
      tracingLogger.error("Error while scheduling workflow reminders", JSON.stringify({ error }));
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

    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger,
      webhookData,
      isDryRun,
      traceContext: spanContext,
    });
  }

  return resultBooking;
};

export default handleSeats;
