import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { userSelect } from "@calcom/prisma/selects/user";
import type { PlatformClientParams } from "@calcom/prisma/zod-utils";

import { findTargetChildEventType, validateManagedEventReassignment } from "./utils";

interface ManagedEventManualReassignmentParams {
  bookingId: number;
  newUserId: number;
  _orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  _emailsEnabled?: boolean;
  _platformClientParams?: PlatformClientParams;
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
  _orgId,
  reassignReason,
  reassignedById,
  _emailsEnabled = true,
  _platformClientParams,
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
    orgId: _orgId,
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
    // First, cancel the original booking
    const cancelled = await tx.booking.update(originalBookingCancellationData);

    // Then, create the new booking
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

  // Delete calendar events from original user
  if (originalUser) {
    // Get translation functions for both users
    const { getTranslation } = await import("@calcom/lib/server/i18n");
    const originalUserT = await getTranslation(originalUser.locale ?? "en", "common");

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
  const newUserT = await getTranslation(newUser.locale ?? "en", "common");

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
      attendees: newBooking.attendees.map(att => ({
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

  // 9. Cancel workflow reminders for original booking
  try {
    await sendCancelledReminders({
      evt: {
        organizer: {
          email: originalUser.email,
          name: originalUser.name || "",
          timeZone: originalUser.timeZone,
          language: { translate: originalUserT, locale: originalUser.locale ?? "en" },
        },
        startTime: dayjs(originalBookingFull.startTime).utc().format(),
        endTime: dayjs(originalBookingFull.endTime).utc().format(),
        title: originalBookingFull.title,
        uid: originalBookingFull.uid,
        attendees: [],
      },
      hideBranding: false,
    });
    reassignLogger.info("Cancelled workflow reminders for original booking");
  } catch (error) {
    reassignLogger.error("Error cancelling workflow reminders", error);
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
          attendees: newBooking.attendees.map(att => ({
            name: att.name,
            email: att.email,
            timeZone: att.timeZone,
            language: { translate: newUserT, locale: att.locale ?? "en" },
          })),
          location: newBooking.location || undefined,
          description: newBooking.description || undefined,
          eventType: { slug: targetEventTypeDetails.slug },
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

  // TODO: 11. Send notification emails (original user, new user, attendees)
  // TODO: 12. Send webhook event BOOKING_REASSIGNED

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

