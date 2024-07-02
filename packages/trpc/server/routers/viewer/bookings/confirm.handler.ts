import { Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import { getLocationValueForDB } from "@calcom/app-store/locations";
import type { LocationObject } from "@calcom/app-store/locations";
import { sendDeclinedEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { getTranslation } from "@calcom/lib/server";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { BookingStatus, MembershipRole, SchedulingType, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TConfirmInputSchema } from "./confirm.schema";
import type { BookingsProcedureContext } from "./util";

type ConfirmOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TConfirmInputSchema;
};

export const confirmHandler = async ({ ctx, input }: ConfirmOptions) => {
  const { user } = ctx;
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
      responses: true,
      metadata: true,
      userPrimaryEmail: true,
      eventType: {
        select: {
          id: true,
          owner: true,
          teamId: true,
          recurringEvent: true,
          title: true,
          slug: true,
          requiresConfirmation: true,
          currency: true,
          length: true,
          description: true,
          price: true,
          bookingFields: true,
          disableGuests: true,
          metadata: true,
          locations: true,
          team: {
            select: {
              parentId: true,
            },
          },
          workflows: {
            include: {
              workflow: {
                include: {
                  steps: true,
                },
              },
            },
          },
          customInputs: true,
          parentId: true,
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
    },
  });

  if (booking.userId !== user.id && booking.eventTypeId) {
    // Only query database when it is explicitly required.
    const eventType = await prisma.eventType.findFirst({
      where: {
        id: booking.eventTypeId,
        schedulingType: SchedulingType.COLLECTIVE,
      },
      select: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (eventType && !eventType.users.find((user) => booking.userId === user.id)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "UNAUTHORIZED" });
    }
  }

  // Do not move this before authorization check.
  // This is done to avoid exposing extra information to the requester.
  if (booking.status === BookingStatus.ACCEPTED) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Booking already confirmed" });
  }

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

  // Cache translations to avoid requesting multiple times.
  const translations = new Map();
  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    const locale = attendee.locale ?? "en";
    let translate = translations.get(locale);
    if (!translate) {
      translate = await getTranslation(locale, "common");
      translations.set(locale, translate);
    }
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate,
        locale,
      },
    };
  });

  const organizerOrganizationProfile = await prisma.profile.findFirst({
    where: {
      userId: user.id,
    },
  });

  const organizerOrganizationId = organizerOrganizationProfile?.organizationId;

  const bookerUrl = await getBookerBaseUrl(
    booking.eventType?.team?.parentId ?? organizerOrganizationId ?? null
  );

  const attendeesList = await Promise.all(attendeesListPromises);

  const evt: CalendarEvent = {
    type: booking?.eventType?.slug as string,
    title: booking.title,
    description: booking.description,
    bookerUrl,
    // TODO: Remove the usage of `bookingFields` in computing responses. We can do that by storing `label` with the response. Also, this would allow us to correctly show the label for a field even after the Event Type has been deleted.
    ...getCalEventResponses({
      bookingFields: booking.eventType?.bookingFields ?? null,
      booking,
    }),
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: booking.userPrimaryEmail ?? user.email,
      name: user.name || "Unnamed",
      username: user.username || undefined,
      timeZone: user.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
      language: { translate: tOrganizer, locale: user.locale ?? "en" },
    },
    attendees: attendeesList,
    location: booking.location ?? "",
    uid: booking.uid,
    destinationCalendar: booking?.destinationCalendar
      ? [booking.destinationCalendar]
      : user.destinationCalendar
      ? [user.destinationCalendar]
      : [],
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
        select: {
          id: true,
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
    const credentials = await getUsersCredentials(user);
    const userWithCredentials = {
      ...user,
      credentials,
    };
    const conferenceCredentialId = getLocationValueForDB(
      booking.location ?? "",
      (booking.eventType?.locations as LocationObject[]) || []
    );
    evt.conferenceCredentialId = conferenceCredentialId.conferenceCredentialId;
    await handleConfirmation({
      user: userWithCredentials,
      evt,
      recurringEventId,
      prisma,
      bookingId,
      booking,
    });
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

          // Posible to refactor TODO:
          const paymentApp = (await appStore[
            paymentAppCredential?.app?.dirName as keyof typeof appStore
          ]?.()) as PaymentApp;
          if (!paymentApp?.lib?.PaymentService) {
            console.warn(`payment App service of type ${paymentApp} is not implemented`);
            return null;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const PaymentService = paymentApp.lib.PaymentService as any;
          const paymentInstance = new PaymentService(paymentAppCredential) as IAbstractPaymentService;
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

    const teamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: booking.eventType?.teamId ?? null },
        parentId: booking?.eventType?.parentId ?? null,
      },
    });

    const orgId = await getOrgIdFromMemberOrTeamId({ memberId: booking.userId, teamId });

    // send BOOKING_REJECTED webhooks
    const subscriberOptions = {
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED,
      teamId,
      orgId,
    };
    const eventTrigger: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_REJECTED;
    const eventTypeInfo: EventTypeInfo = {
      eventTitle: booking.eventType?.title,
      eventDescription: booking.eventType?.description,
      requiresConfirmation: booking.eventType?.requiresConfirmation || null,
      price: booking.eventType?.price,
      currency: booking.eventType?.currency,
      length: booking.eventType?.length,
    };
    const webhookData = {
      ...evt,
      ...eventTypeInfo,
      bookingId,
      eventTypeId: booking.eventType?.id,
      status: BookingStatus.REJECTED,
      smsReminderNumber: booking.smsReminderNumber || undefined,
    };
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
  }

  const message = `Booking ${confirmed}` ? "confirmed" : "rejected";
  const status = confirmed ? BookingStatus.ACCEPTED : BookingStatus.REJECTED;

  return { message, status };
};
