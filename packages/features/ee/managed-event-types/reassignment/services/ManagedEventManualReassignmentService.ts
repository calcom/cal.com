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
import {
  BookingRepository,
  type ManagedEventReassignmentCreatedBooking,
  type ManagedEventCancellationResult,
} from "@calcom/features/bookings/repositories/BookingRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { BookingLocationService } from "@calcom/features/ee/round-robin/lib/bookingLocationService";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type loggerType from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import {
  ManagedEventAssignmentReasonService,
  ManagedEventReassignmentType,
} from "@calcom/features/ee/managed-event-types/reassignment/services/ManagedEventAssignmentReasonRecorder";
import {
  findTargetChildEventType,
  validateManagedEventReassignment,
  buildNewBookingPlan,
} from "@calcom/features/ee/managed-event-types/reassignment/utils";

interface ManagedEventManualReassignmentServiceDeps {
  prisma: PrismaClient;
  bookingRepository: BookingRepository;
  userRepository: UserRepository;
  eventTypeRepository: EventTypeRepository;
  assignmentReasonService: ManagedEventAssignmentReasonService;
}

export interface ManagedEventManualReassignmentParams {
  bookingId: number;
  newUserId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
  isAutoReassignment?: boolean;
}

export class ManagedEventManualReassignmentService {
  private readonly prisma: PrismaClient;
  private readonly bookingRepository: BookingRepository;
  private readonly userRepository: UserRepository;
  private readonly eventTypeRepository: EventTypeRepository;
  private readonly assignmentReasonService: ManagedEventAssignmentReasonService;
  private readonly log = logger.getSubLogger({ prefix: ["ManagedEventManualReassignmentService"] });

  constructor(deps: ManagedEventManualReassignmentServiceDeps) {
    this.prisma = deps.prisma;
    this.bookingRepository = deps.bookingRepository;
    this.userRepository = deps.userRepository;
    this.eventTypeRepository = deps.eventTypeRepository;
    this.assignmentReasonService = deps.assignmentReasonService;
  }

  async execute({
    bookingId,
    newUserId,
    orgId,
    reassignReason,
    reassignedById,
    emailsEnabled = true,
    isAutoReassignment = false,
  }: ManagedEventManualReassignmentParams) {
    const reassignLogger = this.log.getSubLogger({
      prefix: ["manualReassignment", `${bookingId}`],
    });

    reassignLogger.info(`User ${reassignedById} initiating manual reassignment to user ${newUserId}`);

    await validateManagedEventReassignment({ bookingId, bookingRepository: this.bookingRepository });

    const {
      parentEventType,
      currentEventTypeDetails,
      targetEventTypeDetails,
      originalUser,
      newUser,
      originalBookingFull,
      originalUserT,
      newUserT,
    } = await this.resolveTargetEntities(bookingId, newUserId, reassignLogger);

    const newBookingPlan = buildNewBookingPlan({
      originalBookingFull,
      targetEventTypeDetails,
      newUser,
      newUserT,
      reassignedById,
    });

    const { newBooking, cancelledBooking } = await this.executeBookingReassignmentTransaction({
      originalBookingFull,
      newBookingPlan,
      newUser,
      reassignLogger,
    });

    const apps = eventTypeAppMetadataOptionalSchema.parse(targetEventTypeDetails?.metadata?.apps);

    await this.removeOriginalCalendarEvents({
      originalUser,
      currentEventTypeDetails,
      originalBookingFull,
      originalUserT,
      apps,
      logger: reassignLogger,
    });

    const calendarResult = await this.createCalendarEventsForNewUser({
      newUser,
      newUserT,
      targetEventTypeDetails,
      newBooking,
      originalBookingFull,
      apps,
      logger: reassignLogger,
    });

    const { bookingLocation, videoCallUrl, videoCallData, additionalInformation } = calendarResult;

    try {
      await WorkflowRepository.deleteAllWorkflowReminders(originalBookingFull.workflowReminders);
      reassignLogger.info(`Cancelled ${originalBookingFull.workflowReminders.length} workflow reminders`);
    } catch (error) {
      reassignLogger.error("Error cancelling workflow reminders", error);
    }

    if (targetEventTypeDetails.workflows && targetEventTypeDetails.workflows.length > 0) {
      try {
        const creditService = new CreditService();
        const bookerBaseUrl = await getBookerBaseUrl(orgId);
        const bookerUrl = `${bookerBaseUrl}/${newUser.username}/${targetEventTypeDetails.slug}`;

        await WorkflowService.scheduleWorkflowsForNewBooking({
          workflows: targetEventTypeDetails.workflows.map((w) => w.workflow),
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
            attendees: newBooking.attendees.map(
              (att: { name: string; email: string; timeZone: string; locale: string | null }) => ({
                name: att.name,
                email: att.email,
                timeZone: att.timeZone,
                language: { translate: newUserT, locale: att.locale ?? "en" },
              })
            ),
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
          creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
        });
        reassignLogger.info("Scheduled workflow reminders for new booking");
      } catch (error) {
        reassignLogger.error("Error scheduling workflow reminders for new booking", error);
      }
    }

    if (emailsEnabled) {
      await this.sendReassignmentNotifications({
        newBooking,
        targetEventTypeDetails,
        parentEventType,
        newUser,
        newUserT,
        originalUser,
        originalUserT,
        bookingLocation,
        videoCallData,
        additionalInformation,
        reassignReason,
        logger: reassignLogger,
      });
    }

    await this.recordAssignmentReason({
      newBookingId: newBooking.id,
      reassignedById,
      reassignReason,
      isAutoReassignment,
      logger: reassignLogger,
    });

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

  /**
   * Resolves and validates all entities needed for reassignment
   */
  private async resolveTargetEntities(bookingId: number, newUserId: number, reassignLogger: typeof logger) {
    const { currentChildEventType, parentEventType, targetChildEventType, originalBooking } =
      await findTargetChildEventType({
        bookingId,
        newUserId,
        bookingRepository: this.bookingRepository,
        eventTypeRepository: this.eventTypeRepository,
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

    const newUser = await this.userRepository.findByIdWithCredentialsAndCalendar({
      userId: newUserId,
    });

    if (!newUser) {
      throw new Error(`User ${newUserId} not found`);
    }

    const originalUser = await this.userRepository.findByIdWithCredentialsAndCalendar({
      userId: originalBooking.userId ?? 0,
    });

    if (!originalUser) {
      throw new Error("Original booking user not found");
    }

    const originalBookingFull =
      await this.bookingRepository.findByIdWithAttendeesPaymentAndReferences(bookingId);

    if (!originalBookingFull) {
      throw new Error("Original booking not found");
    }

    const { getTranslation } = await import("@calcom/lib/server/i18n");
    const newUserT = await getTranslation(newUser.locale ?? "en", "common");
    const originalUserT = await getTranslation(originalUser.locale ?? "en", "common");

    return {
      parentEventType,
      currentEventTypeDetails,
      targetEventTypeDetails,
      originalUser,
      newUser,
      originalBookingFull,
      originalUserT,
      newUserT,
    };
  }

  private async executeBookingReassignmentTransaction({
    originalBookingFull,
    newBookingPlan,
    newUser,
    reassignLogger,
  }: {
    originalBookingFull: NonNullable<
      Awaited<ReturnType<BookingRepository["findByIdWithAttendeesPaymentAndReferences"]>>
    >;
    newBookingPlan: Parameters<BookingRepository["managedEventReassignmentTransaction"]>[0]["newBookingPlan"];
    newUser: { name: string | null; email: string };
    reassignLogger: typeof logger;
  }) {
    const reassignmentResult = await this.bookingRepository.managedEventReassignmentTransaction({
      bookingId: originalBookingFull.id,
      cancellationReason: `Reassigned to ${newUser.name || newUser.email}`,
      metadata:
        typeof originalBookingFull.metadata === "object" && originalBookingFull.metadata !== null
          ? (originalBookingFull.metadata as Record<string, unknown>)
          : undefined,
      newBookingPlan,
    });

    const newBooking: ManagedEventReassignmentCreatedBooking = reassignmentResult.newBooking;
    const cancelledBooking: ManagedEventCancellationResult = reassignmentResult.cancelledBooking;

    reassignLogger.info("Booking duplication completed", {
      originalBookingId: cancelledBooking.id,
      newBookingId: newBooking.id,
    });

    return { newBooking, cancelledBooking };
  }

  /**
   * Removes calendar events from the original user's calendar
   */
  private async removeOriginalCalendarEvents({
    originalUser,
    currentEventTypeDetails,
    originalBookingFull,
    originalUserT,
    apps,
    logger,
  }: {
    originalUser: NonNullable<Awaited<ReturnType<UserRepository["findByIdWithCredentialsAndCalendar"]>>>;
    currentEventTypeDetails: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>;
    originalBookingFull: NonNullable<
      Awaited<ReturnType<BookingRepository["findByIdWithAttendeesPaymentAndReferences"]>>
    >;
    originalUserT: Awaited<ReturnType<typeof import("@calcom/lib/server/i18n")["getTranslation"]>>;
    apps: ReturnType<typeof eventTypeAppMetadataOptionalSchema.parse>;
    logger: ReturnType<typeof loggerType.getSubLogger>;
  }) {
    if (!originalUser) return;

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
      logger.info("Deleted calendar events from original user");
    } catch (error) {
      logger.error("Error deleting calendar events", error);
    }
  }

  /**
   * Creates calendar events for the new user and updates the booking with location/video details
   */
  private async createCalendarEventsForNewUser({
    newUser,
    newUserT,
    targetEventTypeDetails,
    newBooking,
    originalBookingFull,
    apps,
    logger,
  }: {
    newUser: NonNullable<Awaited<ReturnType<UserRepository["findByIdWithCredentialsAndCalendar"]>>>;
    newUserT: Awaited<ReturnType<typeof import("@calcom/lib/server/i18n")["getTranslation"]>>;
    targetEventTypeDetails: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>;
    newBooking: ManagedEventReassignmentCreatedBooking;
    originalBookingFull: NonNullable<
      Awaited<ReturnType<BookingRepository["findByIdWithAttendeesPaymentAndReferences"]>>
    >;
    apps: ReturnType<typeof eventTypeAppMetadataOptionalSchema.parse>;
    logger: ReturnType<typeof loggerType.getSubLogger>;
  }): Promise<{
    bookingLocation: string | null;
    videoCallUrl: string | null;
    videoCallData: CalendarEvent["videoCallData"];
    additionalInformation: AdditionalInformation;
  }> {
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

    const isManagedEventType = !!targetEventTypeDetails.parentId;
    const isTeamEventType = !!targetEventTypeDetails.team;

    const locationResult = BookingLocationService.getLocationForHost({
      hostMetadata: newUser.metadata,
      eventTypeLocations: targetEventTypeDetails.locations || [],
      isManagedEventType,
      isTeamEventType,
    });

    bookingLocation = locationResult.bookingLocation;
    if (locationResult.requiresActualLink) {
      conferenceCredentialId = locationResult.conferenceCredentialId;
    }

    let videoCallUrl: string | null = null;
    let videoCallData: CalendarEvent["videoCallData"] = undefined;
    const additionalInformation: AdditionalInformation = {};

    try {
      const bookerUrl = await getBookerBaseUrl(targetEventTypeDetails.team?.parentId ?? null);

      const attendees = newBooking.attendees.map(
        (att: { name: string; email: string; timeZone: string; locale: string | null }) => ({
          name: att.name,
          email: att.email,
          timeZone: att.timeZone,
          language: { translate: newUserT, locale: att.locale ?? "en" },
        })
      );

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
          schedulingType: targetEventTypeDetails.schedulingType,
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

      if (results.length > 0) {
        const allFailed = results.every((res) => !res.success);
        const someFailed = results.some((res) => !res.success);

        if (allFailed) {
          logger.error("All calendar integrations failed during reassignment", {
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
          logger.warn("Some calendar integrations failed during reassignment", {
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

      try {
        const responses = {
          ...(typeof newBooking.responses === "object" && newBooking.responses),
          location: {
            value: bookingLocation,
            optionValue: "",
          },
        };

        const finalVideoCallUrlForMetadata = videoCallUrl
          ? getVideoCallUrlFromCalEvent(evt) || videoCallUrl
          : null;
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

        await this.bookingRepository.updateLocationById({
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

        logger.info("Updated booking location and created calendar references", {
          referencesCount: referencesToCreate.length,
          videoCallUrl: bookingMetadataUpdate.videoCallUrl ? "[redacted]" : null,
        });
      } catch (error) {
        logger.error("Error updating booking location and references", error);
      }

      logger.info("Created calendar events for new user");
    } catch (error) {
      logger.error("Error creating calendar events for new user", error);
    }

    return {
      bookingLocation,
      videoCallUrl,
      videoCallData,
      additionalInformation,
    };
  }

  /**
   * Sends reassignment notification emails to all parties
   */
  private async sendReassignmentNotifications({
    newBooking,
    targetEventTypeDetails,
    parentEventType,
    newUser,
    newUserT,
    originalUser,
    originalUserT,
    bookingLocation,
    videoCallData,
    additionalInformation,
    reassignReason,
    logger,
  }: {
    newBooking: ManagedEventReassignmentCreatedBooking;
    targetEventTypeDetails: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>;
    parentEventType: Awaited<ReturnType<typeof findTargetChildEventType>>["parentEventType"];
    newUser: NonNullable<Awaited<ReturnType<UserRepository["findByIdWithCredentialsAndCalendar"]>>>;
    newUserT: Awaited<ReturnType<typeof import("@calcom/lib/server/i18n")["getTranslation"]>>;
    originalUser: NonNullable<Awaited<ReturnType<UserRepository["findByIdWithCredentialsAndCalendar"]>>>;
    originalUserT: Awaited<ReturnType<typeof import("@calcom/lib/server/i18n")["getTranslation"]>>;
    bookingLocation: string | null;
    videoCallData: CalendarEvent["videoCallData"];
    additionalInformation: AdditionalInformation;
    reassignReason?: string;
    logger: ReturnType<typeof loggerType.getSubLogger>;
  }) {
    try {
      const eventTypeMetadata = targetEventTypeDetails.metadata as EventTypeMetadata | undefined;

      const bookerUrlForEmail = await getBookerBaseUrl(targetEventTypeDetails.team?.parentId ?? null);

      const attendeesForEmail = newBooking.attendees.map(
        (att: { name: string; email: string; timeZone: string; locale: string | null }) => ({
          name: att.name,
          email: att.email,
          timeZone: att.timeZone,
          language: { translate: newUserT, locale: att.locale ?? "en" },
        })
      );

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
          schedulingType: parentEventType.schedulingType,
          seatsPerTimeSlot: targetEventTypeDetails.seatsPerTimeSlot,
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

      calEvent.additionalInformation = additionalInformation;

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
      logger.info("Sent scheduled email to new host");

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
        logger.info("Sent reassignment email to original host");
      }

      if (dayjs(calEvent.startTime).isAfter(dayjs())) {
        await sendReassignedUpdatedEmailsAndSMS({
          calEvent,
          eventTypeMetadata,
          showAttendees: !!targetEventTypeDetails.seatsShowAttendees,
        });
        logger.info("Sent update emails to attendees");
      }
    } catch (error) {
      logger.error("Error sending notification emails", error);
    }
  }

  /**
   * Records the assignment reason for the reassignment
   */
  private async recordAssignmentReason({
    newBookingId,
    reassignedById,
    reassignReason,
    isAutoReassignment,
    logger,
  }: {
    newBookingId: number;
    reassignedById: number;
    reassignReason?: string;
    isAutoReassignment: boolean;
    logger: ReturnType<typeof loggerType.getSubLogger>;
  }) {
    try {
      const assignmentResult = await this.assignmentReasonService.recordReassignment({
        newBookingId,
        reassignById: reassignedById,
        reassignReason,
        reassignmentType: isAutoReassignment
          ? ManagedEventReassignmentType.AUTO
          : ManagedEventReassignmentType.MANUAL,
      });
      logger.info("Recorded assignment reason", assignmentResult);
    } catch (error) {
      logger.error("Error recording assignment reason", error);
    }
  }
}
