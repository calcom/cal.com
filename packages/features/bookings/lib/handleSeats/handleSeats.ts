import dayjs from "@calcom/dayjs";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { safeStringify } from "@calcom/lib/safeStringify";
import { createLoggerWithEventDetails } from "../handleNewBooking/logger";
import createNewSeat from "./create/createNewSeat";
import rescheduleSeatedBooking from "./reschedule/rescheduleSeatedBooking";
import type { NewSeatedBookingObject, SeatedBooking, HandleSeatsResultBooking } from "./types";
import { getBookingAuditActorForNewBooking } from "../handleNewBooking/getBookingAuditActorForNewBooking";
import type { BookingEventHandlerService } from "../onBookingEvents/BookingEventHandlerService";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

const fireBookingEvents = async ({
  previousSeatedBooking,
  newBooking,
  originalRescheduledBooking,
  rescheduleUid,
  organizationId,
  bookerEmail,
  bookerName,
  rescheduledBy,
  actionSource,
  actorUserUuid,
  deps,
}: {
  previousSeatedBooking: SeatedBooking;
  newBooking: NonNullable<HandleSeatsResultBooking>;
  originalRescheduledBooking: NewSeatedBookingObject["originalRescheduledBooking"];
  rescheduleUid: string | undefined;
  organizationId: number | null | undefined;
  bookerEmail: string;
  bookerName: string;
  rescheduledBy: string | undefined;
  actionSource: ActionSource;
  actorUserUuid: string | null;
  deps: {
    bookingEventHandler: BookingEventHandlerService;
    logger: ISimpleLogger;
  };
}) => {
  try {
    const bookerAttendeeId = newBooking.attendees?.find((attendee) => attendee.email === bookerEmail)?.id;
    const rescheduledByAttendeeId = newBooking.attendees?.find(
      (attendee) => attendee.email === rescheduledBy
    )?.id;
    const rescheduledByUserUuid = newBooking.user?.email === rescheduledBy ? newBooking.user?.uuid : null;

    const auditActor = getBookingAuditActorForNewBooking({
      bookerAttendeeId: bookerAttendeeId ?? null,
      actorUserUuid,
      bookerEmail,
      bookerName,
      rescheduledBy: rescheduledBy
        ? {
            attendeeId: rescheduledByAttendeeId ?? null,
            userUuid: rescheduledByUserUuid ?? null,
            email: rescheduledBy,
          }
        : null,
      logger: deps.logger,
    });

    const seatReferenceUid = newBooking.seatReferenceUid;
    if (!seatReferenceUid) {
      return;
    }

    if (rescheduleUid && originalRescheduledBooking) {
      const movedToDifferentBooking = newBooking.uid && newBooking.uid !== previousSeatedBooking.uid;
      const newBookingStartTimeMs =
        movedToDifferentBooking && newBooking.startTime
          ? newBooking.startTime.getTime()
          : previousSeatedBooking.startTime.getTime();
      const newBookingEndTimeMs =
        movedToDifferentBooking && newBooking.endTime
          ? newBooking.endTime.getTime()
          : previousSeatedBooking.endTime.getTime();

      await deps.bookingEventHandler.onSeatRescheduled({
        bookingUid: previousSeatedBooking.uid,
        actor: auditActor,
        organizationId: organizationId ?? null,
        auditData: {
          seatReferenceUid,
          attendeeEmail: bookerEmail,
          startTime: {
            old: originalRescheduledBooking.startTime.getTime(),
            new: newBookingStartTimeMs,
          },
          endTime: {
            old: originalRescheduledBooking.endTime.getTime(),
            new: newBookingEndTimeMs,
          },
          rescheduledToBookingUid: {
            old: null,
            new: movedToDifferentBooking ? newBooking.uid || null : null,
          },
        },
        source: actionSource,
      });
    } else {
      await deps.bookingEventHandler.onSeatBooked({
        bookingUid: previousSeatedBooking.uid,
        actor: auditActor,
        organizationId: organizationId ?? null,
        auditData: {
          seatReferenceUid,
          attendeeEmail: bookerEmail,
          attendeeName: bookerName,
          startTime: previousSeatedBooking.startTime.getTime(),
          endTime: previousSeatedBooking.endTime.getTime(),
        },
        source: actionSource,
      });
    }
  } catch (error) {
    deps.logger.error("Error while firing booking events", safeStringify(error));
  }
};

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
    reqUserUuid,
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
    organizationId,
    fullName,
    traceContext,
    actionSource,
    deps: { bookingEventHandler },
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
    await fireBookingEvents({
      previousSeatedBooking: seatedBooking,
      newBooking: resultBooking,
      originalRescheduledBooking,
      rescheduleUid,
      organizationId,
      bookerEmail,
      bookerName: fullName,
      rescheduledBy,
      actionSource,
      actorUserUuid: reqUserUuid ?? null,
      deps: { bookingEventHandler, logger: loggerWithEventDetails },
    });
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

    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun, traceContext });
  }

  return resultBooking;
};

export default handleSeats;
