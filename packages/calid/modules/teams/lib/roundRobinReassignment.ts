// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinCancelledEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS,
} from "@calcom/emails";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import AssignmentReasonHandler, {
  RRReassignmentType,
} from "./RRAssignmentReasonHandler";
import {
  enrichHostsWithDelegationCredentials,
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey,
} from "@calcom/lib/delegationCredential/server";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getEventName } from "@calcom/lib/event";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server/getLuckyUser";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { roundRobinReschedulingManager } from "./handleRescheduleEventManager";
import { handleWorkflowsUpdate } from "./roundRobinManualReassignment";
import { bookingSelect } from "./utils/bookingSelect";
import { getDestinationCalendar } from "./utils/getDestinationCalendar";
import { getTeamMembers } from "./utils/getTeamMembers";

export const roundRobinReassignment = async ({
  bookingId,
  orgId,
  emailsEnabled = true,
  platformClientParams,
  reassignedById,
}: {
  bookingId: number;
  orgId: number | null;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
  reassignedById: number;
}) => {
  const reassignmentLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });

  reassignmentLogger.info(`User ${reassignedById} initiating round robin reassignment`);

  const retrievedBooking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: bookingSelect,
  });

  if (!retrievedBooking) {
    logger.error(`Booking ${bookingId} not found`);
    throw new Error("Booking not found");
  }

  if (!retrievedBooking.user) {
    logger.error(`No user associated with booking ${bookingId}`);
    throw new Error("Booking not found");
  }

  const associatedEventTypeId = retrievedBooking.eventTypeId;

  if (!associatedEventTypeId) {
    logger.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  const eventTypeData = await getEventTypesFromDB(associatedEventTypeId);

  if (!eventTypeData) {
    logger.error(`Event type ${associatedEventTypeId} not found`);
    throw new Error("Event type not found");
  }

  eventTypeData.hosts = eventTypeData.hosts.length
    ? eventTypeData.hosts
    : eventTypeData.users.map((userRecord) => ({
        user: userRecord,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0),
      }));

  if (eventTypeData.hosts.length === 0) {
    throw new Error(ErrorCode.EventTypeNoHosts);
  }

  const variableHostsList = eventTypeData.hosts.filter((hostEntry) => !hostEntry.isFixed);

  const initialOrganizer = retrievedBooking.user;

  const bookingAttendeeEmails = new Set(retrievedBooking.attendees.map((att) => att.email));

  const locatePreviousHost = () => {
    for (const hostEntry of variableHostsList) {
      if (hostEntry.user.id === retrievedBooking.userId) {
        return hostEntry.user;
      }
      if (bookingAttendeeEmails.has(hostEntry.user.email)) {
        return hostEntry.user;
      }
    }
  };

  const formerRRHost = locatePreviousHost();

  const formerHostTranslation = await getTranslation(formerRRHost?.locale || "en", "common");

  const enrichedEventTypeHosts = await enrichHostsWithDelegationCredentials({
    orgId,
    hosts: eventTypeData.hosts,
  });

  const candidateUsers = enrichedEventTypeHosts.reduce((accumulated, hostEntry) => {
    const isCurrentAttendee = bookingAttendeeEmails.has(hostEntry.user.email);
    const isCurrentOrganizer = hostEntry.user.email === initialOrganizer.email;
    
    if (!isCurrentAttendee && !isCurrentOrganizer) {
      accumulated.push({ 
        ...hostEntry.user, 
        isFixed: hostEntry.isFixed, 
        priority: hostEntry?.priority ?? 2 
      });
    }
    return accumulated;
  }, [] as IsFixedAwareUser[]);

  const verifiedAvailableUsers = await ensureAvailableUsers(
    { ...eventTypeData, users: candidateUsers },
    {
      dateFrom: dayjs(retrievedBooking.startTime).format(),
      dateTo: dayjs(retrievedBooking.endTime).format(),
      timeZone: eventTypeData.timeZone || initialOrganizer.timeZone,
    },
    reassignmentLogger
  );

  const selectedNewHost = await getLuckyUser({
    availableUsers: verifiedAvailableUsers,
    eventType: eventTypeData,
    allRRHosts: enrichedEventTypeHosts.filter((hostEntry) => !hostEntry.isFixed),
    routingFormResponse: null,
  });

  const ownershipChanged = !formerRRHost || retrievedBooking.userId === formerRRHost?.id;
  const effectiveOrganizer = ownershipChanged ? selectedNewHost : retrievedBooking.user;
  const effectiveOrganizerTranslation = await getTranslation(effectiveOrganizer?.locale || "en", "common");

  const existingBookingTitle = retrievedBooking.title;
  let updatedBookingTitle = existingBookingTitle;

  const newHostTranslation = await getTranslation(selectedNewHost.locale || "en", "common");

  const compiledTeamMembers = await getTeamMembers({
    eventTypeHosts: eventTypeData.hosts,
    attendees: retrievedBooking.attendees,
    organizer: effectiveOrganizer,
    previousHost: formerRRHost || null,
    reassignedHost: selectedNewHost,
  });

  const attendeeCompilationPromises = retrievedBooking.attendees
    .filter((att) => {
      if (att.email === selectedNewHost.email || att.email === formerRRHost?.email) {
        return false;
      }
      return !compiledTeamMembers.some((member) => member.email === att.email);
    })
    .map(async (att) => {
      const translation = await getTranslation(att.locale ?? "en", "common");
      return {
        email: att.email,
        name: att.name,
        timeZone: att.timeZone,
        language: { translate: translation, locale: att.locale ?? "en" },
        phoneNumber: att.phoneNumber || undefined,
      };
    });

  const processedAttendeeList = await Promise.all(attendeeCompilationPromises);
  let meetingLocation = retrievedBooking.location;
  let workingBooking = retrievedBooking;

  if (ownershipChanged) {
    const existingBookingResponses = retrievedBooking.responses;

    const responsesSchema = getBookingResponsesSchema({
      bookingFields: eventTypeData.bookingFields,
      view: "reschedule",
    });

    const responsesParsing = await responsesSchema.safeParseAsync(existingBookingResponses);

    const parsedResponses = responsesParsing.success ? responsesParsing.data : undefined;

    const hasOrganizerDefaultLocation = eventTypeData.locations.some(
      (loc) => loc.type === OrganizerDefaultConferencingAppType
    );

    if (hasOrganizerDefaultLocation) {
      const newOrganizerMetaParse = userMetadataSchema.safeParse(selectedNewHost.metadata);

      const derivedLocationUrl = newOrganizerMetaParse.success
        ? newOrganizerMetaParse?.data?.defaultConferencingApp?.appLink
        : undefined;

      const fallbackBookingLocation = retrievedBooking.location || "integrations:daily";

      meetingLocation =
        derivedLocationUrl ||
        getLocationValueForDB(fallbackBookingLocation, eventTypeData.locations).bookingLocation;
    }

    const eventDurationInMinutes = dayjs(retrievedBooking.endTime).diff(retrievedBooking.startTime, "minutes");

    const eventNameParams = {
      attendeeName: parsedResponses?.name || "Nameless",
      eventType: eventTypeData.title,
      eventName: eventTypeData.eventName,
      teamName: compiledTeamMembers.length > 1 ? eventTypeData.team?.name : null,
      host: effectiveOrganizer.name || "Nameless",
      location: meetingLocation || "integrations:daily",
      bookingFields: { ...parsedResponses },
      eventDuration: eventDurationInMinutes,
      t: effectiveOrganizerTranslation,
    };

    updatedBookingTitle = getEventName(eventNameParams);

    workingBooking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: selectedNewHost.id,
        userPrimaryEmail: selectedNewHost.email,
        title: updatedBookingTitle,
        idempotencyKey: IdempotencyKeyService.generate({
          startTime: retrievedBooking.startTime,
          endTime: retrievedBooking.endTime,
          userId: selectedNewHost.id,
          reassignedById,
        }),
      },
      select: bookingSelect,
    });
  } else {
    const formerHostAttendeeRecord = retrievedBooking.attendees.find(
      (att) => att.email === formerRRHost.email
    );
    await prisma.attendee.update({
      where: {
        id: formerHostAttendeeRecord!.id,
      },
      data: {
        name: selectedNewHost.name || "",
        email: selectedNewHost.email,
        timeZone: selectedNewHost.timeZone,
        locale: selectedNewHost.locale,
      },
    });
  }

  reassignmentLogger.info(`Successfully reassigned to user ${selectedNewHost.id}`);

  await AssignmentReasonHandler.roundRobinReassignment({
    bookingId,
    reassignById: reassignedById,
    reassignmentType: RRReassignmentType.ROUND_ROBIN,
  });

  const targetCalendar = await getDestinationCalendar({
    eventType: eventTypeData,
    booking: workingBooking,
    newUserId: selectedNewHost.id,
    hasOrganizerChanged: ownershipChanged,
  });

  const previousOrganizerCalendar = ownershipChanged
    ? await prisma.destinationCalendar.findFirst({
        where: {
          userId: initialOrganizer.id,
        },
      })
    : null;

  const calendarEventObject: CalendarEvent = {
    organizer: {
      name: effectiveOrganizer.name || "",
      email: effectiveOrganizer.email,
      language: {
        locale: effectiveOrganizer.locale || "en",
        translate: effectiveOrganizerTranslation,
      },
      timeZone: effectiveOrganizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(effectiveOrganizer.timeFormat),
    },
    startTime: dayjs(workingBooking.startTime).utc().format(),
    endTime: dayjs(workingBooking.endTime).utc().format(),
    type: eventTypeData.slug,
    title: updatedBookingTitle,
    description: eventTypeData.description,
    attendees: processedAttendeeList,
    uid: workingBooking.uid,
    destinationCalendar: targetCalendar,
    team: {
      members: compiledTeamMembers,
      name: eventTypeData.team?.name || "",
      id: eventTypeData.team?.id || 0,
    },
    customInputs: isPrismaObjOrUndefined(workingBooking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventTypeData?.bookingFields ?? null,
      booking: workingBooking,
    }),
    hideOrganizerEmail: eventTypeData.hideOrganizerEmail,
    customReplyToEmail: eventTypeData?.customReplyToEmail,
    location: meetingLocation,
    ...(platformClientParams ? platformClientParams : {}),
  };

  const organizerCredentials = await prisma.credential.findMany({
    where: {
      userId: effectiveOrganizer.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const enrichedOrganizer = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...effectiveOrganizer, credentials: organizerCredentials },
  });

  const { evtWithAdditionalInfo: enhancedCalendarEvent } = await roundRobinReschedulingManager({
    evt: calendarEventObject,
    rescheduleUid: workingBooking.uid,
    newBookingId: undefined,
    changedOrganizer: ownershipChanged,
    previousHostDestinationCalendar: previousOrganizerCalendar ? [previousOrganizerCalendar] : [],
    initParams: {
      user: enrichedOrganizer,
      eventType: eventTypeData,
    },
    bookingId,
    bookingLocation: meetingLocation,
    bookingICalUID: workingBooking.iCalUID,
    bookingMetadata: workingBooking.metadata,
  });

  const { cancellationReason: _unusedCancellation, ...eventWithoutCancellation } = enhancedCalendarEvent;

  if (emailsEnabled) {
    await sendRoundRobinScheduledEmailsAndSMS({
      calEvent: eventWithoutCancellation,
      members: [
        {
          ...selectedNewHost,
          name: selectedNewHost.name || "",
          username: selectedNewHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(selectedNewHost.timeFormat),
          language: { translate: newHostTranslation, locale: selectedNewHost.locale || "en" },
        },
      ],
    });
  }

  if (formerRRHost) {
    const cancellationEventCopy = cloneDeep(enhancedCalendarEvent);
    cancellationEventCopy.title = existingBookingTitle;
    
    if (ownershipChanged) {
      cancellationEventCopy.organizer = {
        name: formerRRHost.name || "",
        email: formerRRHost.email,
        language: {
          locale: formerRRHost.locale || "en",
          translate: formerHostTranslation,
        },
        timeZone: formerRRHost.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(formerRRHost.timeFormat),
      };
    } else if (cancellationEventCopy.team) {
      const existingMembers = cancellationEventCopy.team?.members || [];
      cancellationEventCopy.team.members = existingMembers.filter(
        (member) => member.email !== selectedNewHost.email
      );
      cancellationEventCopy.team.members.unshift({
        id: formerRRHost.id,
        email: formerRRHost.email,
        name: formerRRHost.name || "",
        timeZone: formerRRHost.timeZone,
        language: { translate: formerHostTranslation, locale: formerRRHost.locale || "en" },
      });
    }

    if (emailsEnabled) {
      await sendRoundRobinCancelledEmailsAndSMS(
        cancellationEventCopy,
        [
          {
            ...formerRRHost,
            name: formerRRHost.name || "",
            username: formerRRHost.username || "",
            timeFormat: getTimeFormatStringFromUserTimeFormat(formerRRHost.timeFormat),
            language: { translate: formerHostTranslation, locale: formerRRHost.locale || "en" },
          },
        ],
        eventTypeData?.metadata as EventTypeMetadata,
        { name: selectedNewHost.name, email: selectedNewHost.email }
      );
    }
  }

  if (ownershipChanged) {
    const eventIsInFuture = dayjs(calendarEventObject.startTime).isAfter(dayjs());
    
    if (emailsEnabled && eventIsInFuture) {
      await sendRoundRobinUpdatedEmailsAndSMS({
        calEvent: eventWithoutCancellation,
      });
    }

    await handleWorkflowsUpdate({
      booking: workingBooking,
      newUser: selectedNewHost,
      evt: enhancedCalendarEvent,
      eventType: eventTypeData,
      orgId,
    });
  }

  return {
    bookingId,
    reassignedTo: {
      id: selectedNewHost.id,
      name: selectedNewHost.name,
      email: selectedNewHost.email,
    },
  };
};

export default roundRobinReassignment;