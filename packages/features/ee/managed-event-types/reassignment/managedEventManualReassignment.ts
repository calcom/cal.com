import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import {
  sendReassignedEmailsAndSMS,
  sendReassignedScheduledEmailsAndSMS,
  sendReassignedUpdatedEmailsAndSMS,
} from "@calcom/emails/email-manager";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { BookingLocationService } from "@calcom/features/ee/round-robin/lib/bookingLocationService";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import { cancelWorkflowRemindersForReassignment } from "./lib/cancelWorkflowReminders";
import ManagedEventAssignmentReasonRecorder, {
  ManagedEventReassignmentType,
} from "./lib/ManagedEventAssignmentReasonRecorder";


import { findTargetChildEventType, validateManagedEventReassignment } from "./utils";
import { buildReassignmentBookingData, type CancelledBookingResult } from "./lib/buildReassignmentBookingData";

interface ManagedEventManualReassignmentParams {
  bookingId: number;
  newUserId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
  isAutoReassignment?: boolean;
}

// Select fields needed for the new booking in the reassignment workflow
const REASSIGNMENT_NEW_BOOKING_SELECT = {
  id: true,
  uid: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  metadata: true,
  responses: true,
  iCalUID: true,
  iCalSequence: true,
  smsReminderNumber: true,
  attendees: {
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
    orderBy: {
      id: "asc" as const,
    },
  },
} as const satisfies Prisma.BookingSelect;

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
  
  const { newBookingData, originalBookingCancellationData } = await buildReassignmentBookingData({
    originalBooking: originalBookingFull,
    targetEventType: {
      id: targetEventTypeDetails.id,
      title: targetEventTypeDetails.title,
      eventName: targetEventTypeDetails.eventName,
      team: targetEventTypeDetails.team,
    },
    newUser,
    reassignedById,
  });

  // Execute the reassignment in a transaction (cancel + create)
  const reassignmentResult = await prisma.$transaction(async (tx) => {
    const cancelledBooking = await bookingRepository.cancelBooking(
      originalBookingCancellationData.where,
      originalBookingCancellationData.data,
      originalBookingCancellationData.select,
      tx
    );

    const newBooking = await bookingRepository.createBooking(
      newBookingData,
      REASSIGNMENT_NEW_BOOKING_SELECT,
      tx
    );

    return { newBooking, cancelledBooking };
  });

  const newBooking = reassignmentResult.newBooking;
  const cancelledBooking: CancelledBookingResult = reassignmentResult.cancelledBooking;

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

  const newUserCredentialsWithServiceAccountKey = await getAllCredentialsIncludeServiceAccountKey(
    newUser,
    targetEventTypeDetails
  );

  const newUserForEventManager = {
    ...newUser,
    credentials: newUserCredentialsWithServiceAccountKey,
    destinationCalendar: newUser.destinationCalendar,
  };

  const newEventManager = new EventManager(newUserForEventManager, apps);

  let bookingLocation = originalBookingFull.location || newBooking.location || null;
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
    // Build CalendarEvent using CalendarEventBuilder
    const bookerUrl = await getBookerBaseUrl(targetEventTypeDetails.team?.parentId ?? null);
    
    const attendees = newBooking.attendees.map((att: { name: string; email: string; timeZone: string; locale: string | null }) => ({
      name: att.name,
      email: att.email,
      timeZone: att.timeZone,
      language: { translate: newUserT, locale: att.locale ?? "en" },
    }));
    
    const builder = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl,
        title: newBooking.title,
        startTime: dayjs(newBooking.startTime).utc().format(),
        endTime: dayjs(newBooking.endTime).utc().format(),
        additionalNotes: newBooking.description || undefined,
      })
      .withEventType({
        id: targetEventTypeDetails.id,
        slug: targetEventTypeDetails.slug,
        description: newBooking.description,
        hideOrganizerEmail: targetEventTypeDetails.hideOrganizerEmail,
      })
      .withOrganizer({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        timeZone: newUser.timeZone,
        language: { translate: newUserT, locale: newUser.locale ?? "en" },
      })
      .withAttendees(attendees)
      .withLocation({
        location: bookingLocation || null,
        conferenceCredentialId: conferenceCredentialId ?? undefined,
      })
      .withIdentifiers({
        iCalUID: newBooking.iCalUID || undefined,
      })
      .withUid(newBooking.uid);

    if (newUser.destinationCalendar) {
      builder.withDestinationCalendar([newUser.destinationCalendar]);
    }

    if (targetEventTypeDetails.team) {
      builder.withTeam({
        id: targetEventTypeDetails.team.id || 0,
        name: targetEventTypeDetails.team.name || "",
        members: [
          {
            id: newUser.id,
            name: newUser.name || "",
            email: newUser.email,
            timeZone: newUser.timeZone,
            language: { translate: newUserT, locale: newUser.locale ?? "en" },
          },
        ],
      });
    }

    const evt = builder.build();
    
    if (!evt) {
      throw new Error("Failed to build CalendarEvent");
    }

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
          userId: newUser.id,
          results: results.map((res) => ({
            type: res.type,
            success: res.success,
            error: res.error,
          })),
        });
      } else if (someFailed) {
        reassignLogger.warn("Some calendar integrations failed during reassignment", {
          eventTypeId: targetEventTypeDetails.id,
          userId: newUser.id,
          failedIntegrations: results
            .filter((res) => !res.success)
            .map((res) => ({
              type: res.type,
              error: res.error,
            })),
        });
      }
    }
    
    videoCallUrl = evt.videoCallData?.url ?? null;

    // Extract additional information from calendar creation results
    if (results.length) {
      const createdEvent = results[0]?.createdEvent;
        
      additionalInformation.hangoutLink = createdEvent?.hangoutLink;
      additionalInformation.conferenceData = createdEvent?.conferenceData;
      additionalInformation.entryPoints = createdEvent?.entryPoints;
      evt.additionalInformation = additionalInformation;

      videoCallUrl =
        additionalInformation.hangoutLink ||
        createdEvent?.url ||
        getVideoCallUrlFromCalEvent(evt) ||
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

      const finalVideoCallUrlForMetadata = videoCallUrl ? (getVideoCallUrlFromCalEvent(evt) || videoCallUrl) : null;
      const bookingMetadataUpdate = finalVideoCallUrlForMetadata
        ? { videoCallUrl: finalVideoCallUrlForMetadata }
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
      
      // Build CalendarEvent for emails using CalendarEventBuilder
      const bookerUrlForEmail = await getBookerBaseUrl(targetEventTypeDetails.team?.parentId ?? null);
      
      const attendeesForEmail = newBooking.attendees.map((att: { name: string; email: string; timeZone: string; locale: string | null }) => ({
        name: att.name,
        email: att.email,
        timeZone: att.timeZone,
        language: { translate: newUserT, locale: att.locale ?? "en" },
      }));

      const emailBuilder = new CalendarEventBuilder()
        .withBasicDetails({
          bookerUrl: bookerUrlForEmail,
          title: newBooking.title,
          startTime: dayjs(newBooking.startTime).utc().format(),
          endTime: dayjs(newBooking.endTime).utc().format(),
          additionalNotes: newBooking.description || undefined,
        })
        .withEventType({
          id: targetEventTypeDetails.id,
          slug: targetEventTypeDetails.slug,
          description: newBooking.description,
        })
        .withOrganizer({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          timeZone: newUser.timeZone,
          timeFormat: getTimeFormatStringFromUserTimeFormat(newUser.timeFormat),
          language: { translate: newUserT, locale: newUser.locale ?? "en" },
        })
        .withAttendees(attendeesForEmail)
        .withLocation({
          location: bookingLocation || null,
        })
        .withUid(newBooking.uid);

      if (videoCallData) {
        emailBuilder.withVideoCallData(videoCallData);
      }

      const calEvent = emailBuilder.build();
      
      if (!calEvent) {
        throw new Error("Failed to build CalendarEvent for emails");
      }
      
      // Manually add properties that don't have builder methods yet
      calEvent.additionalInformation = additionalInformation;
      calEvent.schedulingType = null;

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

