import dayjs from "@calcom/dayjs";
import { sendRescheduledEmailsAndSMS } from "@calcom/emails";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import EventManager from "@calcom/lib/EventManager";
import { getEventName } from "@calcom/lib/event";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { CalendarEvent } from "@calcom/types/Calendar";

import getWebhooks from "../../webhooks/lib/getWebhooks";
import { deleteWebhookScheduledTriggers, scheduleTrigger } from "../../webhooks/lib/scheduleTrigger";
import type { EventPayloadType } from "../../webhooks/lib/sendPayload";
import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { addVideoCallDataToEvent } from "./handleNewBooking/addVideoCallDataToEvent";
import { getVideoCallDetails } from "./handleNewBooking/getVideoCallDetails";
import { handleAppsStatus } from "./handleNewBooking/handleAppsStatus";
import { scheduleNoShowTriggers } from "./handleNewBooking/scheduleNoShowTriggers";

const log = logger.getSubLogger({ prefix: ["calendar-sync", "booking-time-change"] });

interface BookingTimeChangeInput {
  bookingUid: string;
  startTime: Date;
  endTime: Date;
  rescheduledBy: string;
  rescheduleReason?: string;
}

interface BookingData {
  id: number;
  uid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string | null;
  location: string | null;
  attendees: Array<{
    id: number;
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
  }>;
  user: {
    id: number;
    name: string | null;
    email: string;
    timeZone: string;
    locale: string | null;
    timeFormat: number | null;
  } | null;
  eventType: {
    id: number;
    title: string;
    description: string | null;
    length: number;
    currency: string;
    price: number;
    teamId: number | null;
    slug: string;
    schedulingType: string | null;
    metadata: any;
    team?: {
      id: number;
      name: string;
      parentId: number | null;
    } | null;
  } | null;
  references: Array<{
    type: string;
    uid: string;
    meetingId?: string | null;
    meetingPassword?: string | null;
    meetingUrl?: string | null;
    externalCalendarId?: string | null;
    credentialId?: number | null;
  }>;
  workflowReminders: Array<{
    id: number;
    referenceId: string | null;
    method: string;
  }>;
  destinationCalendar?: {
    id: number;
    integration: string;
    externalId: string;
    primaryEmail: string | null;
    userId: number | null;
    eventTypeId: number | null;
    credentialId: number | null;
  } | null;
  eventTypeId: number | null;
  userId: number | null;
}

/**
 * Handles booking time changes for calendar sync scenarios.
 * Only performs essential operations: DB update, calendar sync, workflows, emails, webhooks.
 */
export async function handleBookingTimeChange(input: BookingTimeChangeInput) {
  const {
    bookingUid,
    startTime,
    endTime,
    rescheduledBy,
    rescheduleReason = "Rescheduled via calendar sync",
  } = input;

  log.info("Starting booking time change", { bookingUid, startTime, endTime, rescheduledBy });

  // 1. Get the current booking with all needed relations
  const originalBooking = (await prisma.booking.findUnique({
    where: { uid: bookingUid },
    include: {
      attendees: true,
      user: {
        include: {
          credentials: true,
        },
      },
      eventType: {
        include: {
          team: true,
        },
      },
      references: true,
      workflowReminders: {
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      },
      destinationCalendar: true,
    },
  })) as BookingData | null;

  if (!originalBooking) {
    throw new Error(`Booking with UID ${bookingUid} not found`);
  }

  if (!originalBooking.user) {
    throw new Error(`Organizer user not found for booking ${bookingUid}`);
  }

  if (!originalBooking.eventType) {
    throw new Error(`Event type not found for booking ${bookingUid}`);
  }

  // 2. Update the booking record with new times
  const updatedBooking = await prisma.booking.update({
    where: { uid: bookingUid },
    data: {
      startTime,
      endTime,
      updatedAt: new Date(),
    },
  });

  log.info("Updated booking in database", { bookingId: updatedBooking.id });

  // 3. Build calendar event for the new time
  const organizerUser = originalBooking.user;
  const tOrganizer = await getTranslation(organizerUser.locale ?? "en", "common");

  const attendeesList = await Promise.all(
    originalBooking.attendees.map(async (attendee) => {
      const tAttendee = await getTranslation(attendee.locale ?? "en", "common");
      return {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: { translate: tAttendee, locale: attendee.locale ?? "en" },
      };
    })
  );

  const eventNameObject = {
    attendeeName: originalBooking.attendees[0]?.name || "Nameless",
    eventType: originalBooking.eventType.title,
    eventName: originalBooking.title,
    teamName: originalBooking.eventType.team?.name || null,
    host: organizerUser.name || "Nameless",
    location: originalBooking.location || "",
    eventDuration: dayjs(endTime).diff(startTime, "minutes"),
    t: tOrganizer,
  };

  const eventName = getEventName(eventNameObject);
  const bookerUrl = originalBooking.eventType.team
    ? await getBookerBaseUrl(originalBooking.eventType.team.parentId)
    : await getBookerBaseUrl(originalBooking.userId ?? null);

  let evt: CalendarEvent = new CalendarEventBuilder()
    .withBasicDetails({
      bookerUrl,
      title: eventName,
      startTime: dayjs(startTime).utc().format(),
      endTime: dayjs(endTime).utc().format(),
      additionalNotes: originalBooking.description || undefined,
    })
    .withEventType({
      slug: originalBooking.eventType.slug,
      description: originalBooking.eventType.description,
      id: originalBooking.eventType.id,
      schedulingType: originalBooking.eventType.schedulingType,
    })
    .withOrganizer({
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerUser.email,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    })
    .withAttendees(attendeesList)
    .withLocation({
      location: originalBooking.location || "",
    })
    .withDestinationCalendar(originalBooking.destinationCalendar ? [originalBooking.destinationCalendar] : [])
    .withIdentifiers({
      iCalUID: originalBooking.uid,
      iCalSequence: 1, // Increment sequence for reschedule
    })
    .build();

  evt.rescheduledBy = rescheduledBy;

  // 4. Delete old workflow reminders
  log.info("Deleting old workflow reminders", { count: originalBooking.workflowReminders.length });
  await WorkflowRepository.deleteAllWorkflowReminders(originalBooking.workflowReminders);

  // 5. Update calendar integrations
  log.info("Updating calendar integrations");
  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(
    organizerUser,
    originalBooking.eventType
  );
  const apps =
    eventTypeMetaDataSchemaWithTypedApps.parse(originalBooking.eventType.metadata || {}).apps || {};
  const eventManager = new EventManager({ ...organizerUser, credentials: allCredentials }, apps);

  // Add existing video call data to preserve meeting links
  evt = addVideoCallDataToEvent(originalBooking.references, evt);

  const updateManager = await eventManager.reschedule(
    evt,
    originalBooking.uid,
    undefined,
    false, // changedOrganizer
    originalBooking.destinationCalendar ? [originalBooking.destinationCalendar] : [],
    false // isBookingRequestedReschedule
  );

  const results = updateManager.results;
  const referencesToCreate = updateManager.referencesToCreate;

  log.info("Calendar integration update completed", {
    successCount: results.filter((r) => r.success).length,
  });

  // Handle video call details
  const { metadata: videoMetadata, videoCallUrl } = getVideoCallDetails({ results });
  const appsStatus = handleAppsStatus(results, updatedBooking, []);

  // 6. Update booking references if needed
  if (referencesToCreate.length > 0) {
    await prisma.booking.update({
      where: { uid: bookingUid },
      data: {
        references: {
          deleteMany: {},
          createMany: { data: referencesToCreate },
        },
        metadata: { ...originalBooking.metadata, ...videoMetadata },
      },
    });
    log.info("Updated booking references", { count: referencesToCreate.length });
  }

  // 7. Send email notifications
  log.info("Sending reschedule emails");
  await sendRescheduledEmailsAndSMS(
    {
      ...evt,
      additionalInformation: videoMetadata,
      cancellationReason: `$RCH$${rescheduleReason}`, // Prefix for reschedule
      appsStatus,
    },
    originalBooking.eventType.metadata
  );

  // 8. Schedule new workflow reminders
  log.info("Scheduling new workflow reminders");
  const workflows = await getAllWorkflowsFromEventType(originalBooking.eventType, organizerUser.id);

  const evtWithMetadata = {
    ...evt,
    rescheduleReason,
    metadata: videoMetadata,
    eventType: {
      slug: originalBooking.eventType.slug,
      schedulingType: originalBooking.eventType.schedulingType,
      hosts: [], // Not needed for workflows
    },
  };

  await scheduleWorkflowReminders({
    workflows,
    smsReminderNumber: null, // Not available in simple reschedule
    calendarEvent: evtWithMetadata,
    isNotConfirmed: false,
    isRescheduleEvent: true,
    hideBranding: false,
  });

  // 9. Delete old webhook triggers and schedule new ones
  log.info("Updating webhook triggers");
  await deleteWebhookScheduledTriggers({ booking: originalBooking });

  const teamId = await getTeamIdFromEventType({ eventType: originalBooking.eventType });
  const triggerForUser = !teamId || (teamId && originalBooking.eventType.team?.parentId);
  const organizerUserId = triggerForUser ? organizerUser.id : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });

  // Schedule new no-show triggers
  await scheduleNoShowTriggers({
    booking: { startTime, id: updatedBooking.id, location: originalBooking.location },
    triggerForUser,
    organizerUser: { id: organizerUser.id },
    eventTypeId: originalBooking.eventType.id,
    teamId,
    orgId,
  });

  // Schedule new meeting start/end webhook triggers
  const subscriberOptionsMeetingStarted = {
    userId: organizerUserId,
    eventTypeId: originalBooking.eventType.id,
    triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
    teamId,
    orgId,
  };

  const subscriberOptionsMeetingEnded = {
    userId: organizerUserId,
    eventTypeId: originalBooking.eventType.id,
    triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
    teamId,
    orgId,
  };

  const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);
  const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);

  const scheduleTriggerPromises = [];

  for (const subscriber of subscribersMeetingStarted) {
    scheduleTriggerPromises.push(
      scheduleTrigger({
        booking: updatedBooking,
        subscriberUrl: subscriber.subscriberUrl,
        subscriber,
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      })
    );
  }

  for (const subscriber of subscribersMeetingEnded) {
    scheduleTriggerPromises.push(
      scheduleTrigger({
        booking: updatedBooking,
        subscriberUrl: subscriber.subscriberUrl,
        subscriber,
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      })
    );
  }

  await Promise.all(scheduleTriggerPromises);

  // 10. Trigger reschedule webhook
  const subscriberOptions = {
    userId: organizerUserId,
    eventTypeId: originalBooking.eventType.id,
    triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
    teamId,
    orgId,
  };

  const eventTypeInfo = {
    eventTitle: originalBooking.eventType.title,
    eventDescription: originalBooking.eventType.description,
    price: originalBooking.eventType.price,
    currency: originalBooking.eventType.currency,
    length: originalBooking.eventType.length,
  };

  const webhookData: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    bookingId: updatedBooking.id,
    rescheduleId: originalBooking.id,
    rescheduleUid: originalBooking.uid,
    rescheduleStartTime: dayjs(originalBooking.startTime).utc().format(),
    rescheduleEndTime: dayjs(originalBooking.endTime).utc().format(),
    metadata: { ...videoMetadata, videoCallUrl },
    eventTypeId: originalBooking.eventType.id,
    status: "ACCEPTED",
    rescheduledBy,
  };

  await handleWebhookTrigger({
    subscriberOptions,
    eventTrigger: WebhookTriggerEvents.BOOKING_RESCHEDULED,
    webhookData,
  });

  log.info("Booking time change completed successfully", { bookingUid });

  return {
    success: true,
    bookingId: updatedBooking.id,
    bookingUid: updatedBooking.uid,
    message: "Booking time updated successfully",
  };
}
