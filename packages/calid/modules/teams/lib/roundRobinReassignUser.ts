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

export const roundRobinReassignUser = async (payload: RoundRobinReassignmentPayload) => {
  const { bookingId, emailsEnabled = true, platformClientParams, reassignedById } = payload;
  const reassignmentLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });

  reassignmentLogger.info(`User ${reassignedById} initiating round robin reassignment`);

  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingSelect,
  });

  const validateBookingExists = (booking: typeof existingBooking) => {
    if (!booking) {
      logger.error(`Booking ${bookingId} not found`);
      throw new Error("Booking not found");
    }
    if (!booking.user) {
      logger.error(`No user associated with booking ${bookingId}`);
      throw new Error("Booking not found");
    }
    if (!booking.eventTypeId) {
      logger.error(`Booking ${bookingId} does not have an event type id`);
      throw new Error("Event type not found");
    }
    return booking.eventTypeId;
  };

  const eventTypeId = validateBookingExists(existingBooking);
  const eventType = await getEventTypesFromDB(eventTypeId);

  if (!eventType) {
    logger.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  const normalizeEventTypeHosts = (evt: typeof eventType) => {
    return evt.hosts.length
      ? evt.hosts
      : evt.users.map((u) => ({
          user: u,
          isFixed: false,
          priority: 2,
          weight: 100,
          schedule: null,
          createdAt: new Date(0),
        }));
  };

  eventType.hosts = normalizeEventTypeHosts(eventType);

  if (eventType.hosts.length === 0) {
    throw new Error(ErrorCode.EventTypeNoHosts);
  }

  const attendeeEmailSet = new Set(existingBooking!.attendees.map((a) => a.email));
  const flexibleHosts = eventType.hosts.filter((h) => !h.isFixed);

  const identifyPreviousRoundRobinHost = () => {
    const userIdMatch = flexibleHosts.find((h) => h.user.id === existingBooking!.userId);
    if (userIdMatch) return userIdMatch.user;

    const emailMatch = flexibleHosts.find((h) => attendeeEmailSet.has(h.user.email));
    return emailMatch?.user;
  };

  const previousHost = identifyPreviousRoundRobinHost();
  const previousHostTranslation = await getTranslation(previousHost?.locale || "en", "common");

  const hostsWithCredentials = await enrichHostsWithDelegationCredentials({
    orgId: null,
    hosts: eventType.hosts,
  });

  const buildEligibleHostPool = () => {
    const excluded = new Set([existingBooking!.user.email]);
    attendeeEmailSet.forEach((email) => excluded.add(email));

    return hostsWithCredentials
      .filter((h) => !excluded.has(h.user.email))
      .map((h) => ({
        ...h.user,
        isFixed: h.isFixed,
        priority: h?.priority ?? 2,
      }));
  };

  const eligibleHosts = buildEligibleHostPool();

  const availableHosts = await ensureAvailableUsers(
    { ...eventType, users: eligibleHosts },
    {
      dateFrom: dayjs(existingBooking!.startTime).format(),
      dateTo: dayjs(existingBooking!.endTime).format(),
      timeZone: eventType.timeZone || existingBooking!.user.timeZone,
    },
    reassignmentLogger
  );

  const newHost = await getLuckyUser({
    availableUsers: availableHosts,
    eventType: eventType,
    allRRHosts: hostsWithCredentials.filter((h) => !h.isFixed),
    routingFormResponse: null,
  });

  const isOwnershipTransfer = !previousHost || existingBooking!.userId === previousHost.id;
  const primaryOrganizer = isOwnershipTransfer ? newHost : existingBooking!.user;
  const primaryOrganizerTranslation = await getTranslation(primaryOrganizer.locale || "en", "common");

  const originalTitle = existingBooking!.title;
  let finalTitle = originalTitle;
  let updatedLocation = existingBooking!.location;
  let currentBooking = existingBooking!;

  const newHostTranslation = await getTranslation(newHost.locale || "en", "common");

  const teamMembersList = await getMembersInTeam({
    eventTypeHosts: eventType.hosts,
    attendees: existingBooking!.attendees,
    organizer: primaryOrganizer,
    previousHost: previousHost || null,
    reassignedHost: newHost,
  });

  const buildAttendeeList = async () => {
    const teamEmails = new Set(teamMembersList.map((m) => m.email));
    const hostEmails = new Set([newHost.email, previousHost?.email].filter(Boolean));

    const relevantAttendees = existingBooking!.attendees.filter(
      (a) => !hostEmails.has(a.email) && !teamEmails.has(a.email)
    );

    return Promise.all(
      relevantAttendees.map(async (a) => ({
        email: a.email,
        name: a.name,
        timeZone: a.timeZone,
        language: {
          translate: await getTranslation(a.locale ?? "en", "common"),
          locale: a.locale ?? "en",
        },
        phoneNumber: a.phoneNumber || undefined,
      }))
    );
  };

  const attendeeList = await buildAttendeeList();

  if (isOwnershipTransfer) {
    const responsesSchema = getBookingResponsesSchema({
      bookingFields: eventType.bookingFields,
      view: "reschedule",
    });

    const parsedResponses = await responsesSchema
      .safeParseAsync(existingBooking!.responses)
      .then((r) => (r.success ? r.data : undefined));

    const requiresOrganizerLocation = eventType.locations.some(
      (l) => l.type === OrganizerDefaultConferencingAppType
    );

    if (requiresOrganizerLocation) {
      const newHostMeta = userMetadata.safeParse(newHost.metadata);
      const conferenceLink = newHostMeta.success
        ? newHostMeta.data?.defaultConferencingApp?.appLink
        : undefined;

      updatedLocation =
        conferenceLink ||
        getLocationValueForDB(
          existingBooking!.location || "integrations:daily",
          eventType.locations
        ).bookingLocation;
    }

    const durationMinutes = dayjs(existingBooking!.endTime).diff(existingBooking!.startTime, "minutes");

    finalTitle = getEventName({
      attendeeName: parsedResponses?.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      teamName: teamMembersList.length > 1 ? eventType.team?.name : null,
      host: primaryOrganizer.name || "Nameless",
      location: updatedLocation || "integrations:daily",
      bookingFields: { ...parsedResponses },
      eventDuration: durationMinutes,
      t: primaryOrganizerTranslation,
    });

    currentBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        userId: newHost.id,
        userPrimaryEmail: newHost.email,
        title: finalTitle,
        idempotencyKey: KeyService.generate({
          startTime: existingBooking!.startTime,
          endTime: existingBooking!.endTime,
          userId: newHost.id,
          reassignedById,
        }),
      },
      select: bookingSelect,
    });
  } else {
    const previousHostAttendee = existingBooking!.attendees.find((a) => a.email === previousHost!.email);
    await prisma.attendee.update({
      where: { id: previousHostAttendee!.id },
      data: {
        name: newHost.name || "",
        email: newHost.email,
        timeZone: newHost.timeZone,
        locale: newHost.locale,
      },
    });
  }

  reassignmentLogger.info(`Successfully reassigned to user ${newHost.id}`);

  await AssignmentReasonHandler.roundRobinReassignment({
    bookingId,
    reassignById: reassignedById,
    reassignmentType: RRReassignmentType.ROUND_ROBIN,
  });

  const destinationCalendar = await getTargetCalendar({
    eventType: eventType,
    booking: currentBooking,
    newUserId: newHost.id,
    hasOrganizerChanged: isOwnershipTransfer,
  });

  const formerOrganizerCalendar = isOwnershipTransfer
    ? await prisma.destinationCalendar.findFirst({
        where: { userId: existingBooking!.user.id },
      })
    : null;

  const buildCalendarEvent = (): CalendarEvent => ({
    organizer: {
      name: primaryOrganizer.name || "",
      email: primaryOrganizer.email,
      language: {
        locale: primaryOrganizer.locale || "en",
        translate: primaryOrganizerTranslation,
      },
      timeZone: primaryOrganizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(primaryOrganizer.timeFormat),
    },
    startTime: dayjs(currentBooking.startTime).utc().format(),
    endTime: dayjs(currentBooking.endTime).utc().format(),
    type: eventType.slug,
    title: finalTitle,
    description: eventType.description,
    attendees: attendeeList,
    uid: currentBooking.uid,
    destinationCalendar,
    team: {
      members: teamMembersList,
      name: eventType.team?.name || "",
      id: eventType.team?.id || 0,
    },
    customInputs: isPrismaObjOrUndefined(currentBooking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventType?.bookingFields ?? null,
      booking: currentBooking,
    }),
    hideOrganizerEmail: eventType.hideOrganizerEmail,
    customReplyToEmail: eventType?.customReplyToEmail,
    location: updatedLocation,
    ...(platformClientParams || {}),
  });

  const calEvent = buildCalendarEvent();

  const credentials = await prisma.credential.findMany({
    where: { userId: primaryOrganizer.id },
    include: { user: { select: { email: true } } },
  });

  const enrichedPrimaryOrganizer = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...primaryOrganizer, credentials },
  });

  const { evtWithAdditionalInfo } = await roundRobinReschedulingManager({
    evt: calEvent,
    rescheduleUid: currentBooking.uid,
    newBookingId: undefined,
    changedOrganizer: isOwnershipTransfer,
    previousHostDestinationCalendar: formerOrganizerCalendar ? [formerOrganizerCalendar] : [],
    initParams: {
      user: enrichedPrimaryOrganizer,
      eventType: eventType,
    },
    bookingId,
    bookingLocation: updatedLocation,
    bookingICalUID: currentBooking.iCalUID,
    bookingMetadata: currentBooking.metadata,
  });

  const { cancellationReason: _, ...eventWithoutCancellation } = evtWithAdditionalInfo;

  if (emailsEnabled) {
    await RRScheduledEmailAndSMS({
      calEvent: eventWithoutCancellation,
      members: [
        {
          ...newHost,
          name: newHost.name || "",
          username: newHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(newHost.timeFormat),
          language: { translate: newHostTranslation, locale: newHost.locale || "en" },
        },
      ],
    });
  }

  if (previousHost) {
    const cancellationEvent = cloneDeep(evtWithAdditionalInfo);
    cancellationEvent.title = originalTitle;

    if (isOwnershipTransfer) {
      cancellationEvent.organizer = {
        name: previousHost.name || "",
        email: previousHost.email,
        language: {
          locale: previousHost.locale || "en",
          translate: previousHostTranslation,
        },
        timeZone: previousHost.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(previousHost.timeFormat),
      };
    } else if (cancellationEvent.team) {
      cancellationEvent.team.members = [
        {
          id: previousHost.id,
          email: previousHost.email,
          name: previousHost.name || "",
          timeZone: previousHost.timeZone,
          language: { translate: previousHostTranslation, locale: previousHost.locale || "en" },
        },
        ...(cancellationEvent.team.members || []).filter((m) => m.email !== newHost.email),
      ];
    }

    if (emailsEnabled) {
      await RRCancelledEmailAndSMS(
        cancellationEvent,
        [
          {
            ...previousHost,
            name: previousHost.name || "",
            username: previousHost.username || "",
            timeFormat: getTimeFormatStringFromUserTimeFormat(previousHost.timeFormat),
            language: { translate: previousHostTranslation, locale: previousHost.locale || "en" },
          },
        ],
        eventType?.metadata as EventTypeMetadata,
        { name: newHost.name, email: newHost.email }
      );
    }
  }

  if (isOwnershipTransfer) {
    const isFutureEvent = dayjs(calEvent.startTime).isAfter(dayjs());

    if (emailsEnabled && isFutureEvent) {
      await RRUpdatedEmailAndSMS({ calEvent: eventWithoutCancellation });
    }

    await handleWorkflows(currentBooking, newHost, evtWithAdditionalInfo, eventType);
  }

  return {
    bookingId,
    reassignedTo: {
      id: newHost.id,
      name: newHost.name,
      email: newHost.email,
    },
  };
};

export default roundRobinReassignUser;