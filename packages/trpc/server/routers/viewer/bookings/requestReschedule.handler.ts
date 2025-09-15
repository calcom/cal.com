import type { BookingReference, EventType } from "@prisma/client";
import type { TFunction } from "i18next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import dayjs from "@calcom/dayjs";
import { sendRequestRescheduleEmailAndSMS } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { CalendarEventBuilder } from "@calcom/lib/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/lib/builders/CalendarEvent/director";
import { getDelegationCredentialOrRegularCredential } from "@calcom/lib/delegationCredential/server";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { BookingWebhookFactory } from "@calcom/lib/server/service/BookingWebhookFactory";
import { deleteMeeting } from "@calcom/lib/videoClient";
import { prisma } from "@calcom/prisma";
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

  // Check minimum cancellation notice for reschedule
  const minimumCancellationNotice = bookingToReschedule.eventType?.minimumCancellationNotice || 0;
  if (minimumCancellationNotice > 0) {
    const now = dayjs();
    const bookingStart = dayjs(bookingToReschedule.startTime);
    const minutesUntilEvent = bookingStart.diff(now, 'minute');
    
    if (minutesUntilEvent < minimumCancellationNotice) {
      const hours = Math.floor(minimumCancellationNotice / 60);
      const minutes = minimumCancellationNotice % 60;
      let timeString = '';
      
      if (hours > 0 && minutes > 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Cannot reschedule within ${timeString} of event start`,
      });
    }
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

  let eventTypeData: Partial<EventType> = {};
  if (bookingToReschedule.eventTypeId) {
    eventTypeData = await prisma.eventType.findUniqueOrThrow({
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
    type: eventTypeData && eventTypeData.slug ? eventTypeData.slug : bookingToReschedule.title,
    startTime: bookingToReschedule.startTime.toISOString(),
    endTime: bookingToReschedule.endTime.toISOString(),
    hideOrganizerEmail: eventType?.hideOrganizerEmail,
    attendees: usersToPeopleType(
      // username field doesn't exists on attendee but could be in the future
      bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
      tAttendees
    ),
    organizer,
  });
  builder.setLocation(bookingToReschedule.location);
  builder.setUId(bookingToReschedule.uid);
  builder.setDestinationCalendar(bookingToReschedule.destinationCalendar);
  builder.setRecurringEvent(eventTypeData.recurringEvent);
  builder.setDescription(bookingToReschedule.description);
  builder.setResponses({
    ...getCalEventResponses({
      booking: bookingToReschedule,
      bookingFields: bookingToReschedule.eventType?.bookingFields || null,
    }),
    // TODO: We should send responses from the current booking, check this comment https://github.com/calcom/cal.com/issues/9852#issuecomment-1633219613
    //  (bookingToReschedule.responses as Prisma.JsonObject) || null
  });
  builder.setCalendarEvent({
    iCalUID: bookingToReschedule.iCalUID,
  });
  const director = new CalendarEventDirector();
  const calendarEvent = director.buildForRescheduleEmail(builder);

  const handleSeats = async () => {
    if (bookingToReschedule.eventType?.seatsPerTimeSlot) {
      const seatReference = bookingToReschedule.attendees.find((attendee) => attendee.email === user.email);

      //if it's a reschedule the the first attendee is the one rescheduling
      if (seatReference && bookingToReschedule.attendees[0]) {
        await prisma.attendee.update({
          where: {
            id: seatReference.id,
          },
          data: {
            name: bookingToReschedule.attendees[0].name,
            email: bookingToReschedule.attendees[0].email,
          },
        });
      }
    }
  };

  await handleSeats();

  const copyEvent = cloneDeep(calendarEvent);

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: bookingToReschedule.eventType?.team?.id ?? null },
      parentId: bookingToReschedule?.eventType?.parentId ?? null,
    },
  });
  const triggerForUser = !teamId || (teamId && bookingToReschedule.eventType?.parentId);
  const organizerUserId = triggerForUser ? bookingToReschedule.userId : null;

  const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";
  const bookingWebhookFactory = new BookingWebhookFactory({
    organizerUserId,
    teamId,
    orgId: await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId }),
    eventTypeId: bookingToReschedule.eventTypeId,
    eventTrigger,
  });
  const eventPayload = await bookingWebhookFactory.buildEventPayloadFromBooking(bookingToReschedule);

  // Send Webhook
  await bookingWebhookFactory.create(eventPayload);

  //Send Email to organizer
  await sendRequestRescheduleEmailAndSMS(copyEvent, {
    rescheduleLink: organizer.language.translate("reschedule_link_text"),
  });

  const credentials = await getUsersCredentialsIncludeServiceAccountKey({
    userId: user.id,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    credentialIds: bookingToReschedule.references.map((r) => r.credentialId),
  });
  const awaitedReferences: BookingReference[] = [];
  for (const reference of bookingToReschedule.references) {
    if (!reference.credentialId) continue;
    const credential = await getDelegationCredentialOrRegularCredential({
      delegatedCredentialId: reference.credentialId,
      credentials,
      userId: user.id,
    });
    // if rescheduleUid !== bookingToReschedule.uid, this is a new booking
    // then we just update the booking with the new references
    const credentialCalendar = await getCalendar(credential);
    const uidToDelete = reference.uid;
    const { error } = await deleteMeeting({
      credentialCalendar,
      event: calendarEvent,
      bookingRef: {
        ...reference,
        uid: uidToDelete,
      },
    });
    if (!error) {
      awaitedReferences.push(reference);
    }
  }
  return { message: "Booking rescheduled successfully" };
};

function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    const arrCopy = [] as any[];
    obj.forEach((item) => {
      arrCopy.push(cloneDeep(item));
    });
    return arrCopy as T;
  }

  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      (clonedObj as any)[key] = cloneDeep(obj[key]);
    }
  }
  return clonedObj;
}