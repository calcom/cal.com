import type { TFunction } from "i18next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getDelegationCredentialOrRegularCredential } from "@calcom/app-store/delegationCredential";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { sendRequestRescheduleEmailAndSMS } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { deleteMeeting } from "@calcom/features/conferencing/lib/videoClient";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  cancelNoShowTasksForBooking,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { CalendarEventBuilder } from "@calcom/lib/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/lib/builders/CalendarEvent/director";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { BookingWebhookFactory } from "@calcom/lib/server/service/BookingWebhookFactory";
import { prisma } from "@calcom/prisma";
import type { BookingReference, EventType } from "@calcom/prisma/client";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { Person } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRequestRescheduleInputSchema } from "./requestReschedule.schema";
import type { PersonAttendeeCommonFields } from "./types";

type RequestRescheduleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRequestRescheduleInputSchema;
};
const log = logger.getSubLogger({ prefix: ["requestRescheduleHandler"] });
export const requestRescheduleHandler = async ({ ctx, input }: RequestRescheduleOptions) => {
  const { user } = ctx;
  const { bookingId, rescheduleReason: cancellationReason } = input;
  log.debug("Started", safeStringify({ bookingId, cancellationReason, user }));
  const bookingToReschedule = await prisma.booking.findUniqueOrThrow({
    select: {
      id: true,
      uid: true,
      userId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      eventTypeId: true,
      userPrimaryEmail: true,
      eventType: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      location: true,
      attendees: true,
      references: true,
      customInputs: true,
      dynamicEventSlugRef: true,
      dynamicGroupSlugRef: true,
      destinationCalendar: true,
      smsReminderNumber: true,
      workflowReminders: true,
      responses: true,
      iCalUID: true,
    },
    where: {
      uid: bookingId,
      NOT: {
        status: {
          in: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
        },
      },
    },
  });

  if (!bookingToReschedule.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Booking to reschedule doesn't have an owner" });
  }

  if (!bookingToReschedule.eventType && !bookingToReschedule.dynamicEventSlugRef) {
    throw new TRPCError({ code: "FORBIDDEN", message: "EventType not found for current booking." });
  }

  const bookingBelongsToTeam = !!bookingToReschedule.eventType?.teamId;

  const userTeams = await prisma.user.findUniqueOrThrow({
    where: {
      id: user.id,
    },
    select: {
      teams: true,
    },
  });

  if (bookingBelongsToTeam && bookingToReschedule.eventType?.teamId) {
    const userTeamIds = userTeams.teams.map((item) => item.teamId);
    if (userTeamIds.indexOf(bookingToReschedule.eventType?.teamId) === -1) {
      throw new TRPCError({ code: "FORBIDDEN", message: "User isn't a member on the team" });
    }
    log.debug(
      "Request reschedule for team booking",
      safeStringify({
        teamId: bookingToReschedule.eventType?.teamId,
      })
    );
  }
  if (!bookingBelongsToTeam && bookingToReschedule.userId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User isn't owner of the current booking" });
  }

  if (!bookingToReschedule) return;

  let event: Partial<EventType> = {};
  if (bookingToReschedule.eventTypeId) {
    event = await prisma.eventType.findUniqueOrThrow({
      select: {
        title: true,
        schedulingType: true,
        recurringEvent: true,
      },
      where: {
        id: bookingToReschedule.eventTypeId,
      },
    });
  }
  await prisma.booking.update({
    where: {
      id: bookingToReschedule.id,
    },
    data: {
      rescheduled: true,
      cancellationReason,
      status: BookingStatus.CANCELLED,
      updatedAt: dayjs().toISOString(),
      cancelledBy: user.email,
    },
  });

  // delete scheduled jobs of previous booking
  const webhookPromises = [];
  webhookPromises.push(deleteWebhookScheduledTriggers({ booking: bookingToReschedule }));
  webhookPromises.push(cancelNoShowTasksForBooking({ bookingUid: bookingToReschedule.uid }));

  await Promise.all(webhookPromises).catch((error) => {
    log.error("Error while deleting scheduled webhook triggers", JSON.stringify({ error }));
  });

  //cancel workflow reminders of previous booking
  await WorkflowRepository.deleteAllWorkflowReminders(bookingToReschedule.workflowReminders);

  const [mainAttendee] = bookingToReschedule.attendees;
  // @NOTE: Should we assume attendees language?
  const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
  const usersToPeopleType = (users: PersonAttendeeCommonFields[], selectedLanguage: TFunction): Person[] => {
    return users?.map((user) => {
      return {
        email: user.email || "",
        name: user.name || "",
        username: user?.username || "",
        language: { translate: selectedLanguage, locale: user.locale || "en" },
        timeZone: user?.timeZone,
        phoneNumber: user.phoneNumber,
      };
    });
  };

  const userTranslation = await getTranslation(user.locale ?? "en", "common");
  const [userAsPeopleType] = usersToPeopleType([user], userTranslation);
  const organizer = {
    ...userAsPeopleType,
    email: bookingToReschedule.userPrimaryEmail ?? userAsPeopleType.email,
  };

  const builder = new CalendarEventBuilder();
  const eventType = bookingToReschedule.eventType;
  builder.init({
    title: bookingToReschedule.title,
    bookerUrl: eventType?.team
      ? await getBookerBaseUrl(eventType.team.parentId)
      : await getBookerBaseUrl(user.profile?.organizationId ?? null),
    type: event && event.slug ? event.slug : bookingToReschedule.title,
    startTime: bookingToReschedule.startTime.toISOString(),
    endTime: bookingToReschedule.endTime.toISOString(),
    hideOrganizerEmail: eventType?.hideOrganizerEmail,
    attendees: usersToPeopleType(
      // username field doesn't exists on attendee but could be in the future
      bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
      tAttendees
    ),
    organizer,
    iCalUID: bookingToReschedule.iCalUID,
    customReplyToEmail: bookingToReschedule.eventType?.customReplyToEmail,
    team: !!bookingToReschedule.eventType?.team
      ? {
          name: bookingToReschedule.eventType.team.name,
          id: bookingToReschedule.eventType.team.id,
          members: [],
        }
      : undefined,
  });

  const director = new CalendarEventDirector();
  director.setBuilder(builder);
  director.setExistingBooking(bookingToReschedule);
  cancellationReason && director.setCancellationReason(cancellationReason);
  if (Object.keys(event).length) {
    // Request Reschedule flow first cancels the booking and then reschedule email is sent. So, we need to allow reschedule for cancelled booking
    await director.buildForRescheduleEmail({ allowRescheduleForCancelledBooking: true });
  } else {
    await director.buildWithoutEventTypeForRescheduleEmail();
  }

  // Handling calendar and videos cancellation
  // This can set previous time as available, until virtual calendar is done
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  const credentialsMap = new Map();
  credentials.forEach((credential) => {
    credentialsMap.set(credential.type, credential);
  });
  const bookingRefsFiltered: BookingReference[] = bookingToReschedule.references.filter((ref) =>
    credentialsMap.has(ref.type)
  );

  // FIXME: error-handling
  await Promise.allSettled(
    bookingRefsFiltered.map(async (bookingRef) => {
      if (!bookingRef.uid) return;

      if (bookingRef.type.endsWith("_calendar")) {
        const calendar = await getCalendar(
          getDelegationCredentialOrRegularCredential({
            credentials,
            id: {
              credentialId: bookingRef?.credentialId,
              delegationCredentialId: bookingRef?.delegationCredentialId,
            },
          })
        );
        return calendar?.deleteEvent(bookingRef.uid, builder.calendarEvent, bookingRef.externalCalendarId);
      } else if (bookingRef.type.endsWith("_video")) {
        return deleteMeeting(
          getDelegationCredentialOrRegularCredential({
            credentials,
            id: {
              credentialId: bookingRef?.credentialId,
              delegationCredentialId: bookingRef?.delegationCredentialId,
            },
          }),
          bookingRef.uid
        );
      }
    })
  );

  log.debug("builder.calendarEvent", safeStringify(builder.calendarEvent));
  // Send emails
  await sendRequestRescheduleEmailAndSMS(
    builder.calendarEvent,
    {
      rescheduleLink: builder.rescheduleLink,
    },
    eventType?.metadata as EventTypeMetadata
  );

  const calEventResponses = getCalEventResponses({
    booking: bookingToReschedule,
    bookingFields: bookingToReschedule.eventType?.bookingFields ?? null,
  });

  const webhookFactory = new BookingWebhookFactory();
  const payload = webhookFactory.createCancelledEventPayload({
    bookingId: bookingToReschedule.id,
    title: bookingToReschedule.title,
    eventSlug: event.slug ?? null,
    description: bookingToReschedule.description,
    customInputs: bookingToReschedule.customInputs,
    responses: calEventResponses.responses,
    userFieldsResponses: calEventResponses.userFieldsResponses,
    startTime: bookingToReschedule.startTime ? dayjs(bookingToReschedule.startTime).format() : "",
    endTime: bookingToReschedule.endTime ? dayjs(bookingToReschedule.endTime).format() : "",
    organizer,
    attendees: usersToPeopleType(
      // username field doesn't exists on attendee but could be in the future
      bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
      tAttendees
    ),
    uid: bookingToReschedule.uid,
    location: bookingToReschedule.location,
    destinationCalendar: bookingToReschedule.destinationCalendar,
    cancellationReason: `Please reschedule. ${cancellationReason}`, // TODO::Add i18-next for this
    iCalUID: bookingToReschedule.iCalUID,
    ...(bookingToReschedule.smsReminderNumber && {
      smsReminderNumber: bookingToReschedule.smsReminderNumber,
    }),
    cancelledBy: user.email,
  });

  // Send webhook
  const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: bookingToReschedule.eventType?.teamId ?? null },
      parentId: bookingToReschedule.eventType?.parentId ?? null,
    },
  });

  const triggerForUser = !teamId || (teamId && bookingToReschedule.eventType?.parentId);
  const userId = triggerForUser ? bookingToReschedule.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  // Send Webhook call if hooked to BOOKING.CANCELLED
  const subscriberOptions = {
    userId,
    eventTypeId: bookingToReschedule.eventTypeId as number,
    triggerEvent: eventTrigger,
    teamId: teamId ? [teamId] : null,
    orgId,
  };
  const webhooks = await getWebhooks(subscriberOptions);

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, payload).catch((e) => {
      log.error(
        `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${payload.bookingId}, bookingUid: ${payload.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);
};
