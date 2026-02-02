// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinCancelledEmailsAndSMS as RRCancelledEmailAndSMS,
  sendRoundRobinScheduledEmailsAndSMS as RRScheduledEmailAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS as RRUpdatedEmailAndSMS,
} from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import {
  enrichHostsWithDelegationCredentials,
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey,
} from "@calcom/lib/delegationCredential/server";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getEventName } from "@calcom/lib/event";
import { IdempotencyKeyService as KeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server/getLuckyUser";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import AssignmentReasonHandler, { RRReassignmentType } from "./RRAssignmentReasonHandler";
import { handleWorkflows } from "./roundRobinManualReassignment";
import { roundRobinReschedulingManager } from "./roundRobinReschedulingManager";
import { bookingSelect } from "./utils/bookingSelect";
import { getMembersInTeam } from "./utils/getMembersInTeam";
import { getTargetCalendar } from "./utils/getTargetCalendar";

type RoundRobinReassignmentPayload = {
  bookingId: number;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
  reassignedById: number;
};

class BookingReassignmentManager {
  private logContext: ReturnType<typeof logger.getSubLogger>;
  private shouldSendEmails: boolean;
  private platformParams?: PlatformClientParams;
  private initiatorUserId: number;
  private targetBookingId: number;

  constructor(params: RoundRobinReassignmentPayload) {
    this.targetBookingId = params.bookingId;
    this.shouldSendEmails = params.emailsEnabled ?? true;
    this.platformParams = params.platformClientParams;
    this.initiatorUserId = params.reassignedById;
    this.logContext = logger.getSubLogger({
      prefix: ["roundRobinReassign", `${params.bookingId}`],
    });
  }

  async execute() {
    this.logContext.info(`User ${this.initiatorUserId} initiating round robin reassignment`);

    const bookingSnapshot = await this.fetchBookingData();
    const eventTypeConfig = await this.loadEventTypeConfiguration(bookingSnapshot);
    const enrichedHosts = await this.prepareHostsWithCredentials(eventTypeConfig);
    
    const reassignmentContext = await this.analyzeReassignmentContext(
      bookingSnapshot,
      eventTypeConfig,
      enrichedHosts
    );

    const selectedReplacement = await this.selectReplacementHost(
      eventTypeConfig,
      enrichedHosts,
      reassignmentContext,
      bookingSnapshot
    );

    const operationMode = this.determineOperationMode(
      reassignmentContext.outgoingHost,
      bookingSnapshot.userId
    );

    const updatedState = await this.applyReassignment(
      bookingSnapshot,
      eventTypeConfig,
      selectedReplacement,
      reassignmentContext,
      operationMode
    );

    await this.recordReassignmentReason();

    const calendarIntegration = await this.orchestrateCalendarSync(
      updatedState,
      eventTypeConfig,
      selectedReplacement,
      operationMode,
      bookingSnapshot
    );

    await this.dispatchNotifications(
      calendarIntegration,
      selectedReplacement,
      reassignmentContext,
      operationMode,
      eventTypeConfig,
      updatedState
    );

    this.logContext.info(`Successfully reassigned to user ${selectedReplacement.id}`);

    return {
      bookingId: this.targetBookingId,
      reassignedTo: {
        id: selectedReplacement.id,
        name: selectedReplacement.name,
        email: selectedReplacement.email,
      },
    };
  }

  private async fetchBookingData() {
    const record = await prisma.booking.findUnique({
      where: { id: this.targetBookingId },
      select: bookingSelect,
    });

    if (!record) {
      logger.error(`Booking ${this.targetBookingId} not found`);
      throw new Error("Booking not found");
    }

    if (!record.user) {
      logger.error(`No user associated with booking ${this.targetBookingId}`);
      throw new Error("Booking not found");
    }

    if (!record.eventTypeId) {
      logger.error(`Booking ${this.targetBookingId} does not have an event type id`);
      throw new Error("Event type not found");
    }

    return record;
  }

  private async loadEventTypeConfiguration(booking: NonNullable<Awaited<ReturnType<typeof this.fetchBookingData>>>) {
    const config = await getEventTypesFromDB(booking.eventTypeId!);

    if (!config) {
      logger.error(`Event type ${booking.eventTypeId} not found`);
      throw new Error("Event type not found");
    }

    const hostRecords = config.hosts.length > 0
      ? config.hosts
      : config.users.map((u) => ({
          user: u,
          isFixed: false,
          priority: 2,
          weight: 100,
          schedule: null,
          createdAt: new Date(0),
        }));

    if (hostRecords.length === 0) {
      throw new Error(ErrorCode.EventTypeNoHosts);
    }

    return { ...config, hosts: hostRecords };
  }

  private async prepareHostsWithCredentials(eventTypeConfig: Awaited<ReturnType<typeof this.loadEventTypeConfiguration>>) {
    return enrichHostsWithDelegationCredentials({
      orgId: null,
      hosts: eventTypeConfig.hosts,
    });
  }

  private async analyzeReassignmentContext(
    booking: NonNullable<Awaited<ReturnType<typeof this.fetchBookingData>>>,
    eventTypeConfig: Awaited<ReturnType<typeof this.loadEventTypeConfiguration>>,
    enrichedHosts: Awaited<ReturnType<typeof this.prepareHostsWithCredentials>>
  ) {
    const participantEmails = booking.attendees.map((a) => a.email);
    const flexibleHostPool = eventTypeConfig.hosts.filter((h) => !h.isFixed);

    const outgoingHost = (() => {
      for (const hostEntry of flexibleHostPool) {
        if (hostEntry.user.id === booking.userId) {
          return hostEntry.user;
        }
      }
      for (const hostEntry of flexibleHostPool) {
        if (participantEmails.includes(hostEntry.user.email)) {
          return hostEntry.user;
        }
      }
      return undefined;
    })();

    const outgoingTranslation = await getTranslation(outgoingHost?.locale || "en", "common");

    const excludedEmails = new Set([booking.user.email, ...participantEmails]);
    const candidatePool = enrichedHosts
      .filter((h) => !excludedEmails.has(h.user.email))
      .map((h) => ({
        ...h.user,
        isFixed: h.isFixed,
        priority: h?.priority ?? 2,
      }));

    return {
      outgoingHost,
      outgoingTranslation,
      candidatePool,
      participantEmails,
    };
  }

  private async selectReplacementHost(
    eventTypeConfig: Awaited<ReturnType<typeof this.loadEventTypeConfiguration>>,
    enrichedHosts: Awaited<ReturnType<typeof this.prepareHostsWithCredentials>>,
    context: Awaited<ReturnType<typeof this.analyzeReassignmentContext>>,
    booking: NonNullable<Awaited<ReturnType<typeof this.fetchBookingData>>>
  ) {
    const verifiedCandidates = await ensureAvailableUsers(
      { ...eventTypeConfig, users: context.candidatePool },
      {
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: eventTypeConfig.timeZone || booking.user.timeZone,
      },
      this.logContext
    );

    return getLuckyUser({
      availableUsers: verifiedCandidates,
      eventType: eventTypeConfig,
      allRRHosts: enrichedHosts.filter((h) => !h.isFixed),
      routingFormResponse: null,
    });
  }

  private determineOperationMode(outgoingHost: any, currentUserId: number) {
    return !outgoingHost || currentUserId === outgoingHost.id;
  }

  private async applyReassignment(
    booking: NonNullable<Awaited<ReturnType<typeof this.fetchBookingData>>>,
    eventTypeConfig: Awaited<ReturnType<typeof this.loadEventTypeConfiguration>>,
    replacement: Awaited<ReturnType<typeof this.selectReplacementHost>>,
    context: Awaited<ReturnType<typeof this.analyzeReassignmentContext>>,
    isOwnershipChange: boolean
  ) {
    const leadOrganizer = isOwnershipChange ? replacement : booking.user;
    const leadTranslation = await getTranslation(leadOrganizer.locale || "en", "common");
    const replacementTranslation = await getTranslation(replacement.locale || "en", "common");

    let revisedTitle = booking.title;
    let revisedLocation = booking.location;
    let persistedBooking = booking;

    const teamComposition = await getMembersInTeam({
      eventTypeHosts: eventTypeConfig.hosts,
      attendees: booking.attendees,
      organizer: leadOrganizer,
      previousHost: context.outgoingHost || null,
      reassignedHost: replacement,
    });

    const externalAttendees = await this.compileExternalAttendees(
      booking,
      replacement,
      context.outgoingHost,
      teamComposition
    );

    if (isOwnershipChange) {
      const titleUpdateResult = await this.recalculateBookingTitle(
        booking,
        eventTypeConfig,
        replacement,
        leadOrganizer,
        leadTranslation,
        teamComposition
      );

      revisedTitle = titleUpdateResult.title;
      revisedLocation = titleUpdateResult.location;

      persistedBooking = await prisma.booking.update({
        where: { id: this.targetBookingId },
        data: {
          userId: replacement.id,
          userPrimaryEmail: replacement.email,
          title: revisedTitle,
          idempotencyKey: KeyService.generate({
            startTime: booking.startTime,
            endTime: booking.endTime,
            userId: replacement.id,
            reassignedById: this.initiatorUserId,
          }),
        },
        select: bookingSelect,
      });
    } else {
      await this.swapAttendeeIdentity(booking, context.outgoingHost!, replacement);
    }

    return {
      booking: persistedBooking,
      title: revisedTitle,
      location: revisedLocation,
      organizer: leadOrganizer,
      organizerTranslation: leadTranslation,
      replacementTranslation,
      teamComposition,
      externalAttendees,
      originalTitle: booking.title,
    };
  }

  private async compileExternalAttendees(
    booking: NonNullable<Awaited<ReturnType<typeof this.fetchBookingData>>>,
    newHost: any,
    oldHost: any,
    teamMembers: any[]
  ) {
    const teamEmailIndex = new Set(teamMembers.map((m) => m.email));
    const hostEmailIndex = new Set([newHost.email, oldHost?.email].filter(Boolean));

    const externalParticipants = booking.attendees.filter(
      (a) => !hostEmailIndex.has(a.email) && !teamEmailIndex.has(a.email)
    );

    return Promise.all(
      externalParticipants.map(async (participant) => {
        const localeTranslation = await getTranslation(participant.locale ?? "en", "common");
        return {
          email: participant.email,
          name: participant.name,
          timeZone: participant.timeZone,
          language: { translate: localeTranslation, locale: participant.locale ?? "en" },
          phoneNumber: participant.phoneNumber || undefined,
        };
      })
    );
  }

  private async recalculateBookingTitle(
    booking: any,
    eventTypeConfig: any,
    newHost: any,
    organizer: any,
    organizerTranslation: any,
    teamMembers: any[]
  ) {
    const responseSchema = getBookingResponsesSchema({
      bookingFields: eventTypeConfig.bookingFields,
      view: "reschedule",
    });

    const validationResult = await responseSchema.safeParseAsync(booking.responses);
    const bookingData = validationResult.success ? validationResult.data : undefined;

    const usesOrganizerDefaultLocation = eventTypeConfig.locations.some(
      (loc) => loc.type === OrganizerDefaultConferencingAppType
    );

    let computedLocation = booking.location;

    if (usesOrganizerDefaultLocation) {
      const metadataValidation = userMetadata.safeParse(newHost.metadata);
      const appLink = metadataValidation.success
        ? metadataValidation.data?.defaultConferencingApp?.appLink
        : undefined;

      computedLocation =
        appLink ||
        getLocationValueForDB(booking.location || "integrations:daily", eventTypeConfig.locations)
          .bookingLocation;
    }

    const eventDuration = dayjs(booking.endTime).diff(booking.startTime, "minutes");

    const computedTitle = getEventName({
      attendeeName: bookingData?.name || "Nameless",
      eventType: eventTypeConfig.title,
      eventName: eventTypeConfig.eventName,
      teamName: teamMembers.length > 1 ? eventTypeConfig.team?.name : null,
      host: organizer.name || "Nameless",
      location: computedLocation || "integrations:daily",
      bookingFields: { ...bookingData },
      eventDuration,
      t: organizerTranslation,
    });

    return { title: computedTitle, location: computedLocation };
  }

  private async swapAttendeeIdentity(booking: any, outgoingHost: any, incomingHost: any) {
    const targetAttendee = booking.attendees.find((a) => a.email === outgoingHost.email);
    
    await prisma.attendee.update({
      where: { id: targetAttendee!.id },
      data: {
        name: incomingHost.name || "",
        email: incomingHost.email,
        timeZone: incomingHost.timeZone,
        locale: incomingHost.locale,
      },
    });
  }

  private async recordReassignmentReason() {
    await AssignmentReasonHandler.roundRobinReassignment({
      bookingId: this.targetBookingId,
      reassignById: this.initiatorUserId,
      reassignmentType: RRReassignmentType.ROUND_ROBIN,
    });
  }

  private async orchestrateCalendarSync(
    state: Awaited<ReturnType<typeof this.applyReassignment>>,
    eventTypeConfig: any,
    newHost: any,
    isOwnershipChange: boolean,
    originalBooking: any
  ) {
    const targetCalendar = await getTargetCalendar({
      eventType: eventTypeConfig,
      booking: state.booking,
      newUserId: newHost.id,
      hasOrganizerChanged: isOwnershipChange,
    });

    const previousCalendar = isOwnershipChange
      ? await prisma.destinationCalendar.findFirst({
          where: { userId: originalBooking.user.id },
        })
      : null;

    const calEventStructure: CalendarEvent = {
      organizer: {
        name: state.organizer.name || "",
        email: state.organizer.email,
        language: {
          locale: state.organizer.locale || "en",
          translate: state.organizerTranslation,
        },
        timeZone: state.organizer.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(state.organizer.timeFormat),
      },
      startTime: dayjs(state.booking.startTime).utc().format(),
      endTime: dayjs(state.booking.endTime).utc().format(),
      type: eventTypeConfig.slug,
      title: state.title,
      description: eventTypeConfig.description,
      attendees: state.externalAttendees,
      uid: state.booking.uid,
      destinationCalendar: targetCalendar,
      team: {
        members: state.teamComposition,
        name: eventTypeConfig.team?.name || "",
        id: eventTypeConfig.team?.id || 0,
      },
      customInputs: isPrismaObjOrUndefined(state.booking.customInputs),
      ...getCalEventResponses({
        bookingFields: eventTypeConfig?.bookingFields ?? null,
        booking: state.booking,
      }),
      hideOrganizerEmail: eventTypeConfig.hideOrganizerEmail,
      customReplyToEmail: eventTypeConfig?.customReplyToEmail,
      location: state.location,
      ...(this.platformParams || {}),
    };

    const organizerCredentials = await prisma.credential.findMany({
      where: { userId: state.organizer.id },
      include: { user: { select: { email: true } } },
    });

    const enrichedOrganizer = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
      user: { ...state.organizer, credentials: organizerCredentials },
    });

    const { evtWithAdditionalInfo } = await roundRobinReschedulingManager({
      evt: calEventStructure,
      rescheduleUid: state.booking.uid,
      newBookingId: undefined,
      changedOrganizer: isOwnershipChange,
      previousHostDestinationCalendar: previousCalendar ? [previousCalendar] : [],
      initParams: {
        user: enrichedOrganizer,
        eventType: eventTypeConfig,
      },
      bookingId: this.targetBookingId,
      bookingLocation: state.location,
      bookingICalUID: state.booking.iCalUID,
      bookingMetadata: state.booking.metadata,
    });

    return {
      enrichedEvent: evtWithAdditionalInfo,
      plainEvent: (({ cancellationReason: _, ...rest }) => rest)(evtWithAdditionalInfo),
    };
  }

  private async dispatchNotifications(
    calendarData: Awaited<ReturnType<typeof this.orchestrateCalendarSync>>,
    newHost: any,
    context: Awaited<ReturnType<typeof this.analyzeReassignmentContext>>,
    isOwnershipChange: boolean,
    eventTypeConfig: any,
    state: Awaited<ReturnType<typeof this.applyReassignment>>
  ) {
    if (this.shouldSendEmails) {
      await RRScheduledEmailAndSMS({
        calEvent: calendarData.plainEvent,
        members: [
          {
            ...newHost,
            name: newHost.name || "",
            username: newHost.username || "",
            timeFormat: getTimeFormatStringFromUserTimeFormat(newHost.timeFormat),
            language: { translate: state.replacementTranslation, locale: newHost.locale || "en" },
          },
        ],
      });
    }

    if (context.outgoingHost) {
      const cancellationPayload = cloneDeep(calendarData.enrichedEvent);
      cancellationPayload.title = state.originalTitle;

      if (isOwnershipChange) {
        cancellationPayload.organizer = {
          name: context.outgoingHost.name || "",
          email: context.outgoingHost.email,
          language: {
            locale: context.outgoingHost.locale || "en",
            translate: context.outgoingTranslation,
          },
          timeZone: context.outgoingHost.timeZone,
          timeFormat: getTimeFormatStringFromUserTimeFormat(context.outgoingHost.timeFormat),
        };
      } else if (cancellationPayload.team) {
        const updatedMembers = (cancellationPayload.team.members || []).filter(
          (m) => m.email !== newHost.email
        );
        cancellationPayload.team.members = [
          {
            id: context.outgoingHost.id,
            email: context.outgoingHost.email,
            name: context.outgoingHost.name || "",
            timeZone: context.outgoingHost.timeZone,
            language: {
              translate: context.outgoingTranslation,
              locale: context.outgoingHost.locale || "en",
            },
          },
          ...updatedMembers,
        ];
      }

      if (this.shouldSendEmails) {
        await RRCancelledEmailAndSMS(
          cancellationPayload,
          [
            {
              ...context.outgoingHost,
              name: context.outgoingHost.name || "",
              username: context.outgoingHost.username || "",
              timeFormat: getTimeFormatStringFromUserTimeFormat(context.outgoingHost.timeFormat),
              language: {
                translate: context.outgoingTranslation,
                locale: context.outgoingHost.locale || "en",
              },
            },
          ],
          eventTypeConfig?.metadata as EventTypeMetadata,
          { name: newHost.name, email: newHost.email }
        );
      }
    }

    if (isOwnershipChange) {
      const scheduledInFuture = dayjs(calendarData.plainEvent.startTime).isAfter(dayjs());

      if (this.shouldSendEmails && scheduledInFuture) {
        await RRUpdatedEmailAndSMS({ calEvent: calendarData.plainEvent });
      }

      await handleWorkflows(state.booking, newHost, calendarData.enrichedEvent, eventTypeConfig);
    }
  }
}

export const roundRobinReassignUser = async (payload: RoundRobinReassignmentPayload) => {
  const manager = new BookingReassignmentManager(payload);
  return manager.execute();
};

export default roundRobinReassignUser;