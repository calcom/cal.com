import { workflowSelect } from "@calid/features/modules/workflows/utils/getWorkflows";

import type { LocationObject } from "@calcom/app-store/locations";
import { getLocationValueForDB } from "@calcom/app-store/locations";
import { sendDeclinedEmailsAndSMS } from "@calcom/emails";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { ONEHASH_API_KEY, ONEHASH_CHAT_SYNC_BASE_URL, IS_DEV } from "@calcom/lib/constants";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import isPrismaObj, { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { processPaymentRefund } from "@calcom/lib/payment/processPaymentRefund";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import {
  BookingStatus,
  MembershipRole,
  WebhookTriggerEvents,
  UserPermissionRole,
} from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, RecurringEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TConfirmInputSchema } from "./confirm.schema";

type ConfirmOptions = {
  ctx: {
    user: Pick<
      NonNullable<TrpcSessionUser>,
      "id" | "email" | "username" | "role" | "destinationCalendar" | "metadata" | "name"
    >;
  };
  input: TConfirmInputSchema;
};

export const confirmHandler = async ({ ctx, input }: ConfirmOptions) => {
  const { user } = ctx;
  const {
    bookingId,
    recurringEventId, // DEPRECATED: No longer used, kept for API compatibility
    reason: rejectionReason,
    confirmed,
    emailsEnabled,
    platformClientParams,
  } = input;

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
          hideOrganizerEmail: true,
          disableGuests: true,
          customReplyToEmail: true,
          metadata: true,
          locations: true,
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
          workflows: {
            select: {
              workflow: {
                select: workflowSelect,
              },
            },
          },
          customInputs: true,
          parentId: true,
          parent: {
            select: {
              teamId: true,
              calIdTeamId: true,
            },
          },
          calIdTeamId: true,
          calIdTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          calIdWorkflows: {
            select: {
              workflow: {
                select: workflowSelect,
              },
            },
          },
        },
      },
      location: true,
      userId: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          timeZone: true,
          timeFormat: true,
          name: true,
          destinationCalendar: true,
          locale: true,
          metadata: true,
        },
      },
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

  await checkIfUserIsAuthorizedToConfirmBooking({
    eventTypeId: booking.eventTypeId,
    loggedInUserId: user.id,
    teamId: booking.eventType?.calIdTeamId,
    bookingUserId: booking.userId,
    userRole: user.role,
  });

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

    if (isPrismaObjOrUndefined(user.metadata)?.connectedChatAccounts) {
      await handleOHChatSync({
        userId: user.id,
        booking: {
          hostName: user.name ?? "Cal User",
          bookingLocation: booking.location ?? "N/A",
          bookingEventType: booking.eventType?.title ?? "N/A",
          bookingStartTime: booking.startTime.toISOString(),
          bookingEndTime: booking.endTime.toISOString(),
          bookerEmail: booking.attendees[0].email,
          bookerPhone: booking.attendees[0]?.phoneNumber ?? undefined,
          bookingUid: booking.uid,
        },
      });
    }

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
      phoneNumber: attendee.phoneNumber,
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
  const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

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
      email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
      name: booking.user?.name || "Nameless",
      username: booking.user?.username || undefined,
      timeZone: booking.user?.timeZone || "Europe/London",
      timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user?.timeFormat),
      language: { translate: tOrganizer, locale: booking.user?.locale ?? "en" },
      phoneNumber:
        isPrismaObj(booking.user?.metadata) && booking.user?.metadata?.phoneNumber
          ? (booking.user?.metadata?.phoneNumber as string)
          : undefined,
      usePhoneForWhatsApp:
        isPrismaObj(booking.user?.metadata) &&
        typeof booking.user?.metadata?.usePhoneForWhatsApp === "boolean"
          ? (booking.user?.metadata?.usePhoneForWhatsApp as boolean)
          : false,
    },
    attendees: attendeesList,
    location: booking.location ?? "",
    uid: booking.uid,
    destinationCalendar: booking.destinationCalendar
      ? [booking.destinationCalendar]
      : booking.user?.destinationCalendar
      ? [booking.user?.destinationCalendar]
      : [],
    requiresConfirmation: booking?.eventType?.requiresConfirmation ?? false,
    hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
    eventTypeId: booking.eventType?.id,
    customReplyToEmail: booking.eventType?.customReplyToEmail,
    // team: !!booking.eventType?.team
    //   ? {
    //       name: booking.eventType.team.name,
    //       id: booking.eventType.team.id,
    //       members: [],
    //     }
    //   : undefined,
    team: !!booking.eventType?.calIdTeam
      ? {
          name: booking.eventType.calIdTeam.name,
          id: booking.eventType.calIdTeam.id,
          members: [],
        }
      : undefined,
    ...(platformClientParams ? platformClientParams : {}),
  };

  const bookingRecurringEvent = isPrismaObjOrUndefined(booking.metadata)?.recurringEvent as
    | RecurringEvent
    | undefined;

  // Add recurring event to evt if present
  if (bookingRecurringEvent) {
    evt.recurringEvent = bookingRecurringEvent;
  }

  if (confirmed) {
    const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
    const userWithCredentials = {
      ...user,
      credentials,
    };
    const allCredentials = await getAllCredentialsIncludeServiceAccountKey(userWithCredentials, {
      ...booking.eventType,
      metadata: booking.eventType?.metadata as EventTypeMetadata,
    });
    const conferenceCredentialId = getLocationValueForDB(
      booking.location ?? "",
      (booking.eventType?.locations as LocationObject[]) || []
    );
    evt.conferenceCredentialId = conferenceCredentialId.conferenceCredentialId;
    await handleConfirmation({
      user: { ...user, credentials: allCredentials },
      evt,
      recurringEventId: recurringEventId ?? undefined, // DEPRECATED: Ignored in handleConfirmation
      prisma,
      bookingId,
      booking,
      emailsEnabled,
      platformClientParams,
    });
    if (isPrismaObjOrUndefined(user.metadata)?.connectedChatAccounts) {
      await handleOHChatSync({
        userId: user.id,
        booking: {
          hostName: user.name ?? "Cal User",
          bookingLocation: evt.location ?? "N/A",
          bookingEventType: booking.eventType?.title ?? "N/A",
          bookingStartTime: evt.startTime,
          bookingEndTime: evt.endTime,
          bookerEmail: booking.attendees[0].email,
          bookerPhone: booking.attendees[0]?.phoneNumber ?? undefined,
          bookingUid: booking.uid,
        },
      });
    }
  } else {
    evt.rejectionReason = rejectionReason;

    // Handle refunds
    if (!!booking.payment.length) {
      await processPaymentRefund({
        booking: booking,
        teamId: booking.eventType?.calIdTeamId,
      });
    }

    // Update booking status to REJECTED
    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.REJECTED,
        rejectionReason,
      },
    });

    if (emailsEnabled) {
      await sendDeclinedEmailsAndSMS(evt, booking.eventType?.metadata as EventTypeMetadata);
    }

    const calIdTeamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: booking.eventType?.calIdTeamId ?? null },
        parentId: booking?.eventType?.parentId ?? null,
      },
    });

    const orgId = await getOrgIdFromMemberOrTeamId({ memberId: booking.userId, teamId: calIdTeamId });

    // send BOOKING_REJECTED webhooks
    const subscriberOptions: GetSubscriberOptions = {
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED,
      teamId: calIdTeamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
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
    const webhookData: EventPayloadType = {
      ...evt,
      ...eventTypeInfo,
      bookingId,
      eventTypeId: booking.eventType?.id,
      status: BookingStatus.REJECTED,
      smsReminderNumber: booking.smsReminderNumber || undefined,
    };
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
  }

  const message = `Booking ${confirmed ? "confirmed" : "rejected"}`;
  const status = confirmed ? BookingStatus.ACCEPTED : BookingStatus.REJECTED;

  return { message, status };
};

const checkIfUserIsAuthorizedToConfirmBooking = async ({
  eventTypeId,
  loggedInUserId,
  teamId,
  bookingUserId,
  userRole,
}: {
  eventTypeId: number | null;
  loggedInUserId: number;
  teamId?: number | null;
  bookingUserId: number | null;
  userRole: string;
}): Promise<void> => {
  // check system wide admin
  if (userRole === UserPermissionRole.ADMIN) return;

  // Check if the user is the owner of the event type
  if (bookingUserId === loggedInUserId) return;

  // Check if user is associated with the event type
  if (eventTypeId) {
    const [loggedInUserAsHostOfEventType, loggedInUserAsUserOfEventType] = await Promise.all([
      prisma.eventType.findUnique({
        where: {
          id: eventTypeId,
          hosts: { some: { userId: loggedInUserId } },
        },
        select: { id: true },
      }),
      prisma.eventType.findUnique({
        where: {
          id: eventTypeId,
          users: { some: { id: loggedInUserId } },
        },
        select: { id: true },
      }),
    ]);

    if (loggedInUserAsHostOfEventType || loggedInUserAsUserOfEventType) return;
  }

  // Check if the user is an admin/owner of the team the booking belongs to
  if (teamId) {
    const membership = await prisma.calIdMembership.findFirst({
      where: {
        userId: loggedInUserId,
        calIdTeamId: teamId,
        role: {
          in: [MembershipRole.OWNER, MembershipRole.ADMIN],
        },
      },
    });
    if (membership) return;
  }

  throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not authorized to confirm this booking" });
};

async function handleOHChatSync({
  userId,
  booking,
}: {
  userId: number;
  booking: {
    hostName: string;
    bookingLocation: string;
    bookingEventType: string;
    bookingStartTime: string;
    bookingEndTime: string;
    bookingUid: string;
    bookerEmail: string;
    bookerPhone?: string;
  };
}) {
  if (IS_DEV) return Promise.resolve();

  const credentials = await prisma.credential.findMany({
    where: {
      appId: "onehash-chat",
      userId,
    },
  });

  if (credentials.length == 0) return Promise.resolve();

  const account_user_ids: number[] = credentials.reduce<number[]>((acc, cred) => {
    const accountUserId = isPrismaObjOrUndefined(cred.key)?.account_user_id as number | undefined;
    if (accountUserId !== undefined) {
      acc.push(accountUserId);
    }
    return acc;
  }, []);
  const data = {
    account_user_ids,
    booking,
  };

  await fetch(`${ONEHASH_CHAT_SYNC_BASE_URL}/cal_booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONEHASH_API_KEY}`,
    },
    body: JSON.stringify(data),
  });
}
