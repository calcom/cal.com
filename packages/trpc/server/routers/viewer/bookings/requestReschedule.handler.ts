import type { BookingReference, EventType } from "@prisma/client";
import type { TFunction } from "next-i18next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import { CalendarEventBuilder } from "@calcom/core/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/core/builders/CalendarEvent/director";
import { deleteMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { deleteScheduledEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import { sendRequestRescheduleEmail } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { getTranslation } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TRequestRescheduleInputSchema } from "./requestReschedule.schema";
import type { PersonAttendeeCommonFields } from "./types";

type RequestRescheduleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRequestRescheduleInputSchema;
};

export const requestRescheduleHandler = async ({ ctx, input }: RequestRescheduleOptions) => {
  const { user } = ctx;
  const { bookingId, rescheduleReason: cancellationReason } = input;

  const bookingToReschedule = await prisma.booking.findFirstOrThrow({
    select: {
      id: true,
      uid: true,
      userId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      eventTypeId: true,
      eventType: true,
      location: true,
      attendees: true,
      references: true,
      customInputs: true,
      dynamicEventSlugRef: true,
      dynamicGroupSlugRef: true,
      destinationCalendar: true,
      smsReminderNumber: true,
      scheduledJobs: true,
      workflowReminders: true,
      responses: true,
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

  if (!bookingToReschedule.eventType) {
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
    if (userTeamIds.indexOf(bookingToReschedule?.eventType?.teamId) === -1) {
      throw new TRPCError({ code: "FORBIDDEN", message: "User isn't a member on the team" });
    }
  }
  if (!bookingBelongsToTeam && bookingToReschedule.userId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User isn't owner of the current booking" });
  }

  if (bookingToReschedule) {
    let event: Partial<EventType> = {};
    if (bookingToReschedule.eventTypeId) {
      event = await prisma.eventType.findFirstOrThrow({
        select: {
          title: true,
          users: true,
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
      },
    });

    // delete scheduled jobs of previous booking
    cancelScheduledJobs(bookingToReschedule);

    //cancel workflow reminders of previous booking
    bookingToReschedule.workflowReminders.forEach((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      }
    });

    const [mainAttendee] = bookingToReschedule.attendees;
    // @NOTE: Should we assume attendees language?
    const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
    const usersToPeopleType = (
      users: PersonAttendeeCommonFields[],
      selectedLanguage: TFunction
    ): Person[] => {
      return users?.map((user) => {
        return {
          email: user.email || "",
          name: user.name || "",
          username: user?.username || "",
          language: { translate: selectedLanguage, locale: user.locale || "en" },
          timeZone: user?.timeZone,
        };
      });
    };

    const userTranslation = await getTranslation(user.locale ?? "en", "common");
    const [userAsPeopleType] = usersToPeopleType([user], userTranslation);

    const builder = new CalendarEventBuilder();
    builder.init({
      title: bookingToReschedule.title,
      type: event && event.title ? event.title : bookingToReschedule.title,
      startTime: bookingToReschedule.startTime.toISOString(),
      endTime: bookingToReschedule.endTime.toISOString(),
      attendees: usersToPeopleType(
        // username field doesn't exists on attendee but could be in the future
        bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
        tAttendees
      ),
      organizer: userAsPeopleType,
    });

    const director = new CalendarEventDirector();
    director.setBuilder(builder);
    director.setExistingBooking(bookingToReschedule);
    cancellationReason && director.setCancellationReason(cancellationReason);
    if (event) {
      await director.buildForRescheduleEmail();
    } else {
      await director.buildWithoutEventTypeForRescheduleEmail();
    }

    // Handling calendar and videos cancellation
    // This can set previous time as available, until virtual calendar is done
    const credentialsMap = new Map();
    user.credentials.forEach((credential) => {
      credentialsMap.set(credential.type, credential);
    });
    const bookingRefsFiltered: BookingReference[] = bookingToReschedule.references.filter((ref) =>
      credentialsMap.has(ref.type)
    );
    bookingRefsFiltered.forEach(async (bookingRef) => {
      if (bookingRef.uid) {
        if (bookingRef.type.endsWith("_calendar")) {
          const calendar = await getCalendar(credentialsMap.get(bookingRef.type));

          return calendar?.deleteEvent(bookingRef.uid, builder.calendarEvent, bookingRef.externalCalendarId);
        } else if (bookingRef.type.endsWith("_video")) {
          return deleteMeeting(credentialsMap.get(bookingRef.type), bookingRef.uid);
        }
      }
    });

    // Send emails
    await sendRequestRescheduleEmail(builder.calendarEvent, {
      rescheduleLink: builder.rescheduleLink,
    });

    const evt: CalendarEvent = {
      title: bookingToReschedule?.title,
      type: event && event.title ? event.title : bookingToReschedule.title,
      description: bookingToReschedule?.description || "",
      customInputs: isPrismaObjOrUndefined(bookingToReschedule.customInputs),
      ...getCalEventResponses({
        booking: bookingToReschedule,
        bookingFields: bookingToReschedule.eventType?.bookingFields ?? null,
      }),
      startTime: bookingToReschedule?.startTime ? dayjs(bookingToReschedule.startTime).format() : "",
      endTime: bookingToReschedule?.endTime ? dayjs(bookingToReschedule.endTime).format() : "",
      organizer: userAsPeopleType,
      attendees: usersToPeopleType(
        // username field doesn't exists on attendee but could be in the future
        bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
        tAttendees
      ),
      uid: bookingToReschedule?.uid,
      location: bookingToReschedule?.location,
      destinationCalendar:
        bookingToReschedule?.destinationCalendar || bookingToReschedule?.destinationCalendar,
      cancellationReason: `Please reschedule. ${cancellationReason}`, // TODO::Add i18-next for this
    };

    // Send webhook
    const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";
    // Send Webhook call if hooked to BOOKING.CANCELLED
    const subscriberOptions = {
      userId: bookingToReschedule.userId,
      eventTypeId: (bookingToReschedule.eventTypeId as number) || 0,
      triggerEvent: eventTrigger,
    };
    const webhooks = await getWebhooks(subscriberOptions);
    const promises = webhooks.map((webhook) =>
      sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
        ...evt,
        smsReminderNumber: bookingToReschedule.smsReminderNumber || undefined,
      }).catch((e) => {
        console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`, e);
      })
    );
    await Promise.all(promises);
  }
};
