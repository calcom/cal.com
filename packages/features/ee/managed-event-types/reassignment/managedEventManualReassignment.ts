import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import {
  sendReassignedScheduledEmailsAndSMS,
  sendReassignedEmailsAndSMS,
  sendReassignedUpdatedEmailsAndSMS,
} from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import type { AdditionalInformation } from "@calcom/types/Calendar";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { userSelect } from "@calcom/prisma/selects/user";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import { cancelWorkflowRemindersForReassignment } from "./lib/cancelWorkflowReminders";
import ManagedEventAssignmentReasonRecorder, {
  ManagedEventReassignmentType,
} from "./lib/ManagedEventAssignmentReasonRecorder";

import { findTargetChildEventType, validateManagedEventReassignment } from "./utils";

interface ManagedEventManualReassignmentParams {
  bookingId: number;
  newUserId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
  isAutoReassignment?: boolean;
}

export async function managedEventManualReassignment({
  bookingId,
  newUserId,
  orgId,
  reassignReason,
  reassignedById,
  emailsEnabled = true,
  isAutoReassignment = false,
}: ManagedEventManualReassignmentParams) {
  const reassignLogger = logger.getSubLogger({
    prefix: ["managedEventManualReassignment", `${bookingId}`],
  });

  reassignLogger.info(`User ${reassignedById} initiating manual reassignment to user ${newUserId}`);

  await validateManagedEventReassignment({ bookingId });

  const bookingRepository = new BookingRepository(prisma);
  const userRepository = new UserRepository(prisma);

  const {
    currentChildEventType,
    parentEventType,
    targetChildEventType,
    originalBooking,
  } = await findTargetChildEventType({
    bookingId,
    newUserId,
  });

  reassignLogger.info("Found target child event type", {
    currentChildId: currentChildEventType.id,
    targetChildId: targetChildEventType.id,
    parentId: parentEventType.id,
  });

  const [currentEventTypeDetails, targetEventTypeDetails] = await Promise.all([
    getEventTypesFromDB(currentChildEventType.id),
    getEventTypesFromDB(targetChildEventType.id),
  ]);

  if (!currentEventTypeDetails || !targetEventTypeDetails) {
    throw new Error("Failed to load event type details");
  }

    const newUser = await prisma.user.findUnique({
      where: { id: newUserId },
      select: {
        ...userSelect,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
      },
    });

  if (!newUser) {
    throw new Error(`User ${newUserId} not found`);
  }

  const newUserCredentials = await prisma.credential.findMany({
    where: { userId: newUserId },
    include: { user: { select: { email: true } } },
  });

  const originalUser = await userRepository.findByIdWithCredentialsAndCalendar({
    userId: originalBooking.userId ?? 0,
  });

  if (!originalUser) {
    throw new Error("Original booking user not found");
  }

  const originalBookingFull = await bookingRepository.findByIdWithAttendeesPaymentAndReferences(bookingId);

  if (!originalBookingFull) {
    throw new Error("Original booking not found");
  }

  // Note: Unlike auto-reassignment, manual reassignment allows force reassigning to unavailable users
  // The UI shows availability status and requires confirmation, but the admin can override
  // This matches Round Robin manual reassignment behavior

  const { buildReassignmentBookingData } = await import("./lib/buildReassignmentBookingData");
  
  const { newBookingData, originalBookingCancellationData } = await buildReassignmentBookingData({
    originalBooking: originalBookingFull,
    targetEventType: {
      id: targetEventTypeDetails.id,
      title: targetEventTypeDetails.title,
      eventName: targetEventTypeDetails.eventName,
      team: targetEventTypeDetails.team,
    },
    newUser,
    reassignReason,
    reassignedById,
    originalUserId: originalUser.id,
  });

  // Execute the reassignment in a transaction (cancel + create)
  const { newBooking, cancelledBooking } = await prisma.$transaction(async (tx) => {

    const cancelled = await tx.booking.update({
      where: originalBookingCancellationData.where,
      data: originalBookingCancellationData.data,
      select: originalBookingCancellationData.select,
    });

    const created = await tx.booking.create({
      data: newBookingData,
      include: {
        user: true,
        attendees: true,
        payment: true,
        references: true,
        eventType: true,
      },
    });

    const existingReassignment =
      typeof cancelled.metadata === "object" &&
      cancelled.metadata &&
      "reassignment" in cancelled.metadata &&
      typeof cancelled.metadata.reassignment === "object" &&
      cancelled.metadata.reassignment !== null
        ? cancelled.metadata.reassignment
        : {};

    await tx.booking.update({
      where: { id: cancelled.id },
      data: {
        metadata: {
          ...(typeof cancelled.metadata === "object" && cancelled.metadata !== null
            ? cancelled.metadata
            : {}),
          reassignment: {
            ...existingReassignment,
            reassignedToBookingId: created.id,
          },
        },
      },
    });

    return { newBooking: created, cancelledBooking: cancelled };
  });

  reassignLogger.info("Booking duplication completed", {
    originalBookingId: cancelledBooking.id,
    newBookingId: newBooking.id,
  });

  const apps = eventTypeAppMetadataOptionalSchema.parse(targetEventTypeDetails?.metadata?.apps);

  const { getTranslation } = await import("@calcom/lib/server/i18n");
  const originalUserT = await getTranslation(originalUser.locale ?? "en", "common");
  const newUserT = await getTranslation(newUser.locale ?? "en", "common");

  if (originalUser) {
    const originalUserCredentials = await getAllCredentialsIncludeServiceAccountKey(
      originalUser,
      currentEventTypeDetails
    );
    const originalEventManager = new EventManager(
      { ...originalUser, credentials: originalUserCredentials },
      apps
    );

    try {
      await originalEventManager.deleteEventsAndMeetings({
        event: {
          type: currentEventTypeDetails.slug,
          organizer: {
            id: originalUser.id,
            name: originalUser.name || "",
            email: originalUser.email,
            timeZone: originalUser.timeZone,
            language: { translate: originalUserT, locale: originalUser.locale ?? "en" },
          },
          startTime: dayjs(originalBookingFull.startTime).utc().format(),
          endTime: dayjs(originalBookingFull.endTime).utc().format(),
          title: originalBookingFull.title,
          uid: originalBookingFull.uid,
          attendees: [],
          iCalUID: originalBookingFull.iCalUID,
        },
        bookingReferences: originalBookingFull.references,
      });
      reassignLogger.info("Deleted calendar events from original user");
    } catch (error) {
      reassignLogger.error("Error deleting calendar events", error);
    }
  }

  const newUserWithCredentials = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...newUser, credentials: newUserCredentials },
  });

  const newEventManager = new EventManager(newUserWithCredentials, apps);

  let videoCallUrl: string | null = null;
  const additionalInformation: AdditionalInformation = {};
  try {
    const evt = {
      organizer: {
        id: newUser.id,
        name: newUser.name || "",
        email: newUser.email,
        timeZone: newUser.timeZone,
        language: { translate: newUserT, locale: newUser.locale ?? "en" },
      },
      startTime: dayjs(newBooking.startTime).utc().format(),
      endTime: dayjs(newBooking.endTime).utc().format(),
      title: newBooking.title,
      type: targetEventTypeDetails.slug,
      uid: newBooking.uid,
      attendees: newBooking.attendees.map((att: {
        name: string;
        email: string;
        timeZone: string;
        locale: string | null;
      }) => ({
        name: att.name,
        email: att.email,
        timeZone: att.timeZone,
        language: { translate: newUserT, locale: att.locale ?? "en" },
      })),
      team: targetEventTypeDetails.team ? {
        members: [{
          id: newUser.id,
          email: newUser.email,
          name: newUser.name || "",
          timeZone: newUser.timeZone,
          language: { translate: newUserT, locale: newUser.locale ?? "en" },
        }],
        name: targetEventTypeDetails.team.name || "",
        id: targetEventTypeDetails.team.id || 0,
      } : undefined,
      location: newBooking.location || undefined,
      description: newBooking.description || undefined,
    };

    const createManager = await newEventManager.create(evt);
    const results = createManager.results || [];
    
    // Extract video call URL following the same pattern as new booking creation
    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    if (results.length) {
      additionalInformation.hangoutLink = results[0]?.createdEvent?.hangoutLink;
      additionalInformation.conferenceData = results[0]?.createdEvent?.conferenceData;
      additionalInformation.entryPoints = results[0]?.createdEvent?.entryPoints;
      
      // Prefer hangoutLink over initial videoCallUrl
      videoCallUrl = additionalInformation.hangoutLink || videoCallUrl;
    }
    
    reassignLogger.info("Created calendar events for new user");
  } catch (error) {
    reassignLogger.error("Error creating calendar events for new user", error);
  }

  try {
    const cancelResult = await cancelWorkflowRemindersForReassignment({
      workflowReminders: originalBookingFull.workflowReminders,
    });
    reassignLogger.info(`Cancelled ${cancelResult.cancelledCount} workflow reminders`);
  } catch (error) {
    reassignLogger.error("Error cancelling workflow reminders", error);
  }

  if (targetEventTypeDetails.workflows && targetEventTypeDetails.workflows.length > 0) {
    try {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      
      const bookerBaseUrl = await getBookerBaseUrl(orgId);
      const bookerUrl = `${bookerBaseUrl}/${newUser.username}/${targetEventTypeDetails.slug}`;

      await WorkflowService.scheduleWorkflowsForNewBooking({
        workflows: targetEventTypeDetails.workflows.map(w => w.workflow),
        smsReminderNumber: newBooking.smsReminderNumber || null,
        calendarEvent: {
          type: targetEventTypeDetails.slug,
          uid: newBooking.uid,
          title: newBooking.title,
          startTime: dayjs(newBooking.startTime).utc().format(),
          endTime: dayjs(newBooking.endTime).utc().format(),
          organizer: {
            id: newUser.id,
            name: newUser.name || "",
            email: newUser.email,
            timeZone: newUser.timeZone,
            language: { translate: newUserT, locale: newUser.locale ?? "en" },
          },
          attendees: newBooking.attendees.map((att: {
            name: string;
            email: string;
            timeZone: string;
            locale: string | null;
          }) => ({
            name: att.name,
            email: att.email,
            timeZone: att.timeZone,
            language: { translate: newUserT, locale: att.locale ?? "en" },
          })),
          location: newBooking.location || undefined,
          description: newBooking.description || undefined,
          eventType: { slug: targetEventTypeDetails.slug },
          bookerUrl,
          metadata: videoCallUrl ? { videoCallUrl, ...additionalInformation } : undefined,
        },
        hideBranding: !!targetEventTypeDetails.owner?.hideBranding,
        seatReferenceUid: undefined,
        isDryRun: false,
        isConfirmedByDefault: targetEventTypeDetails.requiresConfirmation ? false : true,
        isNormalBookingOrFirstRecurringSlot: true,
        isRescheduleEvent: false,
      });
      reassignLogger.info("Scheduled workflow reminders for new booking");
    } catch (error) {
      reassignLogger.error("Error scheduling workflow reminders for new booking", error);
    }
  }

  if (emailsEnabled) {
    try {
      const eventTypeMetadata = targetEventTypeDetails.metadata as EventTypeMetadata | undefined;

      const calEvent = {
        type: targetEventTypeDetails.slug,
        uid: newBooking.uid,
        title: newBooking.title,
        startTime: dayjs(newBooking.startTime).utc().format(),
        endTime: dayjs(newBooking.endTime).utc().format(),
        organizer: {
          id: newUser.id,
          name: newUser.name || "",
          email: newUser.email,
          timeZone: newUser.timeZone,
          language: { translate: newUserT, locale: newUser.locale ?? "en" },
          timeFormat: getTimeFormatStringFromUserTimeFormat(newUser.timeFormat),
        },
        attendees: newBooking.attendees.map((att) => ({
          name: att.name,
          email: att.email,
          timeZone: att.timeZone,
          language: { translate: newUserT, locale: att.locale ?? "en" },
        })),
        location: newBooking.location || undefined,
        description: newBooking.description || undefined,
        metadata: videoCallUrl ? { videoCallUrl, ...additionalInformation } : undefined,
      };

      await sendReassignedScheduledEmailsAndSMS({
        calEvent,
        members: [
          {
            ...newUser,
            name: newUser.name || "",
            username: newUser.username || "",
            timeFormat: getTimeFormatStringFromUserTimeFormat(newUser.timeFormat),
            language: { translate: newUserT, locale: newUser.locale || "en" },
          },
        ],
        eventTypeMetadata,
        reassigned: {
          name: newUser.name,
          email: newUser.email,
          reason: reassignReason,
          byUser: originalUser.name || undefined,
        },
      });
      reassignLogger.info("Sent scheduled email to new host");


      if (originalUser) {
        const cancelledCalEvent = {
          ...calEvent,
          organizer: {
            id: originalUser.id,
            name: originalUser.name || "",
            email: originalUser.email,
            timeZone: originalUser.timeZone,
            language: { translate: originalUserT, locale: originalUser.locale ?? "en" },
            timeFormat: getTimeFormatStringFromUserTimeFormat(originalUser.timeFormat),
          },
        };

        await sendReassignedEmailsAndSMS({
          calEvent: cancelledCalEvent,
          members: [
            {
              ...originalUser,
              name: originalUser.name || "",
              username: originalUser.username || "",
              timeFormat: getTimeFormatStringFromUserTimeFormat(originalUser.timeFormat),
              language: { translate: originalUserT, locale: originalUser.locale || "en" },
            },
          ],
          reassignedTo: { name: newUser.name, email: newUser.email },
          eventTypeMetadata,
        });
        reassignLogger.info("Sent reassignment email to original host");
      }

      if (dayjs(calEvent.startTime).isAfter(dayjs())) {
        await sendReassignedUpdatedEmailsAndSMS({
          calEvent,
          eventTypeMetadata,
        });
        reassignLogger.info("Sent update emails to attendees");
      }
    } catch (error) {
      reassignLogger.error("Error sending notification emails", error);
    }
  }

  try {
    const assignmentResult = await ManagedEventAssignmentReasonRecorder.managedEventReassignment({
      newBookingId: newBooking.id,
      reassignById: reassignedById,
      reassignReason,
      reassignmentType: isAutoReassignment
        ? ManagedEventReassignmentType.AUTO
        : ManagedEventReassignmentType.MANUAL,
    });
    reassignLogger.info("Recorded assignment reason", assignmentResult);
  } catch (error) {
    reassignLogger.error("Error recording assignment reason", error);
  }

  // TODO: 13. Send webhook event BOOKING_REASSIGNED

  reassignLogger.info("Reassignment completed successfully", {
    originalBookingId: cancelledBooking.id,
    newBookingId: newBooking.id,
    fromUserId: originalUser.id,
    toUserId: newUser.id,
  });

  return {
    newBooking,
    cancelledBooking,
  };
}

export default managedEventManualReassignment;

