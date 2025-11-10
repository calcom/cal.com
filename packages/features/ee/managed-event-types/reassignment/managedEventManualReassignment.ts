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
import { BookingLocationService } from "@calcom/features/ee/round-robin/lib/bookingLocationService";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

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

  const newUser = await userRepository.findByIdWithCredentialsAndCalendar({
    userId: newUserId,
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

  // Determine the proper location and conferenceCredentialId for the new event type
  let bookingLocation = newBooking.location || null;
  let conferenceCredentialId: number | null = null;

  const locationResult = BookingLocationService.getLocationForHost({
    hostMetadata: newUser.metadata,
    eventTypeLocations: targetEventTypeDetails.locations || [],
    isManagedEventType: false,
    isTeamEventType: !!targetEventTypeDetails.team,
  });

  bookingLocation = locationResult.bookingLocation;
  if (locationResult.requiresActualLink) {
    conferenceCredentialId = locationResult.conferenceCredentialId;
  }

  let videoCallUrl: string | null = null;
  let videoCallData: CalendarEvent["videoCallData"] = undefined;
  const additionalInformation: AdditionalInformation = {};
  try {
    const evt: CalendarEvent = {
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
      iCalUID: newBooking.iCalUID,
      destinationCalendar: newUser.destinationCalendar ? [newUser.destinationCalendar] : [],
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
      team: targetEventTypeDetails.team
        ? {
            members: [
              {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name || "",
                timeZone: newUser.timeZone,
                language: { translate: newUserT, locale: newUser.locale ?? "en" },
              },
            ],
            name: targetEventTypeDetails.team.name || "",
            id: targetEventTypeDetails.team.id || 0,
          }
        : undefined,
      location: bookingLocation || undefined,
      description: newBooking.description || undefined,
      hideOrganizerEmail: targetEventTypeDetails.hideOrganizerEmail,
      conferenceCredentialId: conferenceCredentialId ?? undefined,
    };

    const createManager = await newEventManager.create(evt);
    const results = createManager.results || [];
    const referencesToCreate = createManager.referencesToCreate || [];

    // Check for calendar integration failures
    if (results.length > 0) {
      const allFailed = results.every((res) => !res.success);
      const someFailed = results.some((res) => !res.success);

      if (allFailed) {
        reassignLogger.error("All calendar integrations failed during reassignment", {
          eventTypeId: targetEventTypeDetails.id,
          eventTypeSlug: targetEventTypeDetails.slug,
          userEmail: newUser.email,
          results: results.map((res) => ({
            type: res.type,
            success: res.success,
            error: res.error,
          })),
        });
      } else if (someFailed) {
        reassignLogger.warn("Some calendar integrations failed during reassignment", {
          eventTypeId: targetEventTypeDetails.id,
          userEmail: newUser.email,
          failedIntegrations: results
            .filter((res) => !res.success)
            .map((res) => ({
              type: res.type,
              error: res.error,
            })),
        });
      }
    }
    
    // Extract videoCallUrl from evt.videoCallData first (Cal Video, Teams, etc.)
    videoCallUrl = evt.videoCallData?.url ?? null;

    // Extract additional information from calendar creation results
    if (results.length) {
      const createdEvent = results[0]?.createdEvent;
        
      additionalInformation.hangoutLink = createdEvent?.hangoutLink;
      additionalInformation.conferenceData = createdEvent?.conferenceData;
      additionalInformation.entryPoints = createdEvent?.entryPoints;
      evt.additionalInformation = additionalInformation;

      // Build videoCallUrl with fallback chain
      videoCallUrl =
        additionalInformation.hangoutLink ||
        createdEvent?.url ||
        videoCallUrl;
    }

    videoCallData = evt.videoCallData;
    
    // Update booking with location, references, and metadata in a single database call
    try {
      const responses = {
        ...(typeof newBooking.responses === "object" && newBooking.responses),
        location: {
          value: bookingLocation,
          optionValue: "",
        },
      };

      // Update booking metadata with video call URL for success page display
      // This matches the pattern used in RegularBookingService
      const bookingMetadataUpdate = videoCallUrl
        ? { videoCallUrl: getVideoCallUrlFromCalEvent(evt) || videoCallUrl }
        : {};

      const referencesToCreateForDb = referencesToCreate.map((reference) => {
        const { credentialId, ...restReference } = reference;
        return {
          ...restReference,
          ...(credentialId && credentialId > 0 ? { credentialId } : {}),
        };
      });

      await bookingRepository.updateLocationById({
        where: { id: newBooking.id },
        data: {
          location: bookingLocation,
          metadata: {
            ...(typeof newBooking.metadata === "object" && newBooking.metadata ? newBooking.metadata : {}),
            ...bookingMetadataUpdate,
          },
          referencesToCreate: referencesToCreateForDb,
          responses,
          iCalSequence: (newBooking.iCalSequence || 0) + 1,
        },
      });
      
      reassignLogger.info("Updated booking location and created calendar references", {
        location: bookingLocation,
        referencesCount: referencesToCreate.length,
        videoCallUrl: bookingMetadataUpdate.videoCallUrl || null,
      });
    } catch (error) {
      reassignLogger.error("Error updating booking location and references", error);
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
          location: bookingLocation || undefined,
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

      const calEvent: CalendarEvent = {
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
        location: bookingLocation || undefined,
        description: newBooking.description || undefined,
        videoCallData,
        additionalInformation,
        schedulingType: null,
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

  // TODO: Send webhook event BOOKING_REASSIGNED

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

