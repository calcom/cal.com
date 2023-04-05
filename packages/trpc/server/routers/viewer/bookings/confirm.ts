import { BookingStatus, MembershipRole, Prisma, SchedulingType } from "@prisma/client";

import { sendDeclinedEmails } from "@calcom/emails";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getTranslation } from "@calcom/lib/server";
import type { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TRPCEndpointOptions } from "../../../trpc";

export const confirm = async ({ ctx, input }: TRPCEndpointOptions<typeof bookingConfirmPatchBodySchema>) => {
  const { user, prisma } = ctx;
  const { bookingId, recurringEventId, reason: rejectionReason, confirmed } = input;
  const tOrganizer = await getTranslation(user.locale ?? "en", "common");

  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: {
      title: true,
      description: true,
      customInputs: true,
      startTime: true,
      endTime: true,
      attendees: true,
      eventTypeId: true,
      eventType: {
        select: {
          id: true,
          owner: true,
          teamId: true,
          recurringEvent: true,
          title: true,
          requiresConfirmation: true,
          currency: true,
          length: true,
          description: true,
          price: true,
          workflows: {
            include: {
              workflow: {
                include: {
                  steps: true,
                },
              },
            },
          },
        },
      },
      location: true,
      userId: true,
      id: true,
      uid: true,
      payment: true,
      destinationCalendar: true,
      paid: true,
      recurringEventId: true,
      status: true,
      smsReminderNumber: true,
      scheduledJobs: true,
    },
  });
  const authorized = async () => {
    // if the organizer
    if (booking.userId === user.id) {
      return true;
    }
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: booking.eventTypeId || undefined,
      },
      select: {
        id: true,
        schedulingType: true,
        users: true,
      },
    });
    if (
      eventType?.schedulingType === SchedulingType.COLLECTIVE &&
      eventType.users.find((user) => user.id === user.id)
    ) {
      return true;
    }
    return false;
  };

  if (!(await authorized())) throw new TRPCError({ code: "UNAUTHORIZED", message: "UNAUTHORIZED" });

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Booking already confirmed" });

  // If booking requires payment and is not paid, we don't allow confirmation
  if (confirmed && booking.payment.length > 0 && !booking.paid) {
    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.ACCEPTED,
      },
    });

    return { message: "Booking confirmed", status: BookingStatus.ACCEPTED };
  }

  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);

  const evt: CalendarEvent = {
    type: booking.eventType?.title || booking.title,
    title: booking.title,
    description: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: user.email,
      name: user.name || "Unnamed",
      timeZone: user.timeZone,
      language: { translate: tOrganizer, locale: user.locale ?? "en" },
    },
    attendees: attendeesList,
    location: booking.location ?? "",
    uid: booking.uid,
    destinationCalendar: booking?.destinationCalendar || user.destinationCalendar,
    requiresConfirmation: booking?.eventType?.requiresConfirmation ?? false,
    eventTypeId: booking.eventType?.id,
  };

  const recurringEvent = parseRecurringEvent(booking.eventType?.recurringEvent);
  if (recurringEventId) {
    if (
      !(await prisma.booking.findFirst({
        where: {
          recurringEventId,
          id: booking.id,
        },
      }))
    ) {
      // FIXME: It might be best to retrieve recurringEventId from the booking itself.
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Recurring event id doesn't belong to the booking",
      });
    }
  }
  if (recurringEventId && recurringEvent) {
    const groupedRecurringBookings = await prisma.booking.groupBy({
      where: {
        recurringEventId: booking.recurringEventId,
      },
      by: [Prisma.BookingScalarFieldEnum.recurringEventId],
      _count: true,
    });
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    recurringEvent.count = groupedRecurringBookings[0]._count;
    // count changed, parsing again to get the new value in
    evt.recurringEvent = parseRecurringEvent(recurringEvent);
  }

  if (confirmed) {
    await handleConfirmation({ user, evt, recurringEventId, prisma, bookingId, booking });
  } else {
    evt.rejectionReason = rejectionReason;
    if (recurringEventId) {
      // The booking to reject is a recurring event and comes from /booking/upcoming, proceeding to mark all related
      // bookings as rejected.
      await prisma.booking.updateMany({
        where: {
          recurringEventId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    } else {
      // handle refunds
      if (!!booking.payment.length) {
        const successPayment = booking.payment.find((payment) => payment.success);
        if (!successPayment) {
          // Disable paymentLink for this booking
        } else {
          let eventTypeOwnerId;
          if (booking.eventType?.owner) {
            eventTypeOwnerId = booking.eventType.owner.id;
          } else if (booking.eventType?.teamId) {
            const teamOwner = await prisma.membership.findFirst({
              where: {
                teamId: booking.eventType.teamId,
                role: MembershipRole.OWNER,
              },
              select: {
                userId: true,
              },
            });
            eventTypeOwnerId = teamOwner?.userId;
          }

          if (!eventTypeOwnerId) {
            throw new Error("Event Type owner not found for obtaining payment app credentials");
          }

          const paymentAppCredentials = await prisma.credential.findMany({
            where: {
              userId: eventTypeOwnerId,
              appId: successPayment.appId,
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

          const paymentAppCredential = paymentAppCredentials.find((credential) => {
            return credential.appId === successPayment.appId;
          });

          if (!paymentAppCredential) {
            throw new Error("Payment app credentials not found");
          }
          const appStore = (await import("@calcom/app-store")).default;
          // Posible to refactor TODO:
          const paymentApp = await appStore[paymentAppCredential?.app?.dirName as keyof typeof appStore];
          if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
            console.warn(`payment App service of type ${paymentApp} is not implemented`);
            return null;
          }

          const PaymentService = paymentApp.lib.PaymentService;
          const paymentInstance = new PaymentService(paymentAppCredential);
          const paymentData = await paymentInstance.refund(successPayment.id);
          if (!paymentData.refunded) {
            throw new Error("Payment could not be refunded");
          }
        }
      }
      // end handle refunds.
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    }

    await sendDeclinedEmails(evt);
  }

  const message = "Booking " + confirmed ? "confirmed" : "rejected";
  const status = confirmed ? BookingStatus.ACCEPTED : BookingStatus.REJECTED;

  return { message, status };
};
