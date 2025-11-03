import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import {
  sendManagedEventScheduledEmailsAndSMS,
  sendManagedEventReassignedEmailsAndSMS,
  sendManagedEventUpdatedEmailsAndSMS,
} from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { userSelect } from "@calcom/prisma/selects/user";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import { cancelAllWorkflowRemindersForReassignment } from "./lib/handleWorkflowsUpdate";
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

/**
 * Manually reassign a managed event booking to a specific user
 * 
 * This creates a new booking on the target user's child event type
 * and cancels the original booking, similar to rescheduling.
 */
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

  // 1. Validate the booking can be reassigned
  await validateManagedEventReassignment({ bookingId });

  // 2. Find and validate target child event type
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

  // 3. Get full event type details and user info
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
          select: {
            id: true,
            type: true,
            key: true,
            userId: true,
            teamId: true,
            appId: true,
            invalid: true,
            user: {
              select: {
                email: true,
              },
            },
            delegationCredentialId: true,
          },
        },
      },
    });

  if (!newUser) {
    throw new Error(`User ${newUserId} not found`);
  }

  // Fetch credentials separately like Round Robin does
  const newUserCredentials = await prisma.credential.findMany({
    where: { userId: newUserId },
    include: { user: { select: { email: true } } },
  });

  const originalUser = await prisma.user.findUnique({
    where: { id: originalBooking.userId ?? undefined },
    include: {
      credentials: {
        select: {
          id: true,
          type: true,
          key: true,
          userId: true,
          teamId: true,
          appId: true,
          invalid: true,
          user: {
            select: {
              email: true,
            },
          },
          delegationCredentialId: true,
        },
      },
      destinationCalendar: true,
    },
  });

  if (!originalUser) {
    throw new Error("Original booking user not found");
  }

  // 4. Get the full original booking with all relations
  const originalBookingFull = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      attendees: true,
      user: true,
      payment: true,
      references: true,
      eventType: true,
    },
  });

  if (!originalBookingFull) {
    throw new Error("Original booking not found");
  }

  // 5. Check availability of new user at booking time
  // Transform user to IsFixedAwareUser format for availability checking
  const enrichedUsersResult = await enrichUsersWithDelegationCredentials({
    orgId,
    users: [withSelectedCalendars(newUser)],
  });

  const newUserAsFixedAwareUser = {
    ...enrichedUsersResult[0],
    isFixed: false,
  } as IsFixedAwareUser;

  try {
    await ensureAvailableUsers(
      { ...targetEventTypeDetails, users: [newUserAsFixedAwareUser] },
      {
        dateFrom: dayjs(originalBookingFull.startTime).format(),
        dateTo: dayjs(originalBookingFull.endTime).format(),
        timeZone: targetEventTypeDetails.timeZone || newUser.timeZone,
      },
      reassignLogger
    );
    reassignLogger.info("Target user is available");
  } catch (error) {
    // Log with reassignment context, then abort
    reassignLogger.error("Target user is not available at the booking time", error);
    throw error;
  }

  // 6. Build the new booking data and cancellation data
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

  // 7. Execute the reassignment in a transaction (cancel + create)
  const { newBooking, cancelledBooking } = await prisma.$transaction(async (tx) => {
    // First, cancel the original booking - destructure to avoid type conflicts
    const cancelled = await tx.booking.update({
      where: originalBookingCancellationData.where,
      data: originalBookingCancellationData.data,
      select: originalBookingCancellationData.select,
    });

    // Then, create the new booking - destructure to avoid type conflicts
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

    // Update the cancelled booking metadata with new booking ID
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

  // 8. Handle calendar events - delete from old user, create for new user
  const apps = eventTypeAppMetadataOptionalSchema.parse(targetEventTypeDetails?.metadata?.apps);

  // Get translation functions for both users
  const { getTranslation } = await import("@calcom/lib/server/i18n");
  const originalUserT = await getTranslation(originalUser.locale ?? "en", "common");
  const newUserT = await getTranslation(newUser.locale ?? "en", "common");

  // Delete calendar events from original user
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
      // Don't fail the reassignment if calendar deletion fails
    }
  }

  // Create calendar events for new user

  const newUserWithCredentials = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...newUser, credentials: newUserCredentials },
  });

  const newEventManager = new EventManager(newUserWithCredentials, apps);

  try {
    await newEventManager.create({
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
    });
    reassignLogger.info("Created calendar events for new user");
  } catch (error) {
    reassignLogger.error("Error creating calendar events for new user", error);
    // Calendar event creation failure is serious - should we rollback?
  }

  // 9. Cancel ALL workflow reminders for original booking
  try {
    const cancelResult = await cancelAllWorkflowRemindersForReassignment({
      bookingUid: originalBookingFull.uid,
    });
    reassignLogger.info(`Cancelled ${cancelResult.totalCancelled} workflow reminders (${cancelResult.emailCancelled} email, ${cancelResult.smsCancelled} SMS)`);
  } catch (error) {
    reassignLogger.error("Error cancelling workflow reminders", error);
    // Don't throw - workflow cancellation failure shouldn't block reassignment
  }

  // 10. Schedule workflow reminders for new booking
  if (targetEventTypeDetails.workflows && targetEventTypeDetails.workflows.length > 0) {
    try {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      
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
          bookerUrl: `${newUser.username}/${targetEventTypeDetails.slug}`,
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

  // 11. Send notification emails (original user, new user, attendees)
  if (emailsEnabled) {
    try {
      const eventTypeMetadata = targetEventTypeDetails.metadata as EventTypeMetadata | undefined;

      // Build CalendarEvent for emails
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
      };

      // Send email to new host (booking scheduled)
      await sendManagedEventScheduledEmailsAndSMS({
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

      // Send email to old host (booking reassigned/cancelled)
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

        await sendManagedEventReassignedEmailsAndSMS({
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

      // Send email to attendees (host changed)
      if (dayjs(calEvent.startTime).isAfter(dayjs())) {
        await sendManagedEventUpdatedEmailsAndSMS({
          calEvent,
          eventTypeMetadata,
        });
        reassignLogger.info("Sent update emails to attendees");
      }
    } catch (error) {
      reassignLogger.error("Error sending notification emails", error);
      // Don't throw - emails are not critical for reassignment success
    }
  }

  // 12. Record assignment reason
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
    // Don't throw - assignment reason recording failure shouldn't block reassignment
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

