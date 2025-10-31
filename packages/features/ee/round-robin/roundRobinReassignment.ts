import { cloneDeep } from "lodash";



import {
  enrichHostsWithDelegationCredentials,
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey,
} from "@calcom/app-store/delegationCredential";
import { OrganizerDefaultConferencingAppType, getLocationValueForDB } from "@calcom/app-store/locations";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import {
  sendRoundRobinReassignedEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinUpdatedEmailsAndSMS,
} from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getBookingResponsesPartialSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import AssignmentReasonRecorder, {
  RRReassignmentType,
} from "@calcom/features/ee/round-robin/assignmentReason/AssignmentReasonRecorder";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata, PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { handleRescheduleEventManager } from "./handleRescheduleEventManager";
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
  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });

  roundRobinReassignLogger.info(`User ${reassignedById} initiating round robin reassignment`);

  let booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: bookingSelect,
  });

  if (!booking) {
    logger.error(`Booking ${bookingId} not found`);
    throw new Error("Booking not found");
  }

  if (!booking.user) {
    logger.error(`No user associated with booking ${bookingId}`);
    throw new Error("Booking not found");
  }

  const eventTypeId = booking.eventTypeId;

  if (!eventTypeId) {
    logger.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  const eventType = await getEventTypesFromDB(eventTypeId);

  if (!eventType) {
    logger.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  if (eventType.hostGroups && eventType.hostGroups.length > 1) {
    logger.error(
      `Event type ${eventTypeId} has more than one round robin group, reassignment is not allowed`
    );
    throw new Error("Reassignment not allowed with more than one round robin group");
  }

  eventType.hosts = eventType.hosts.length
    ? eventType.hosts
    : eventType.users.map((user) => ({
        user,
        isFixed: false,
        priority: 2,
        weight: 100,
        schedule: null,
        createdAt: new Date(0), // use earliest possible date as fallback
        groupId: null,
      }));

  if (eventType.hosts.length === 0) {
    throw new Error(ErrorCode.EventTypeNoHosts);
  }

  const roundRobinHosts = eventType.hosts.filter((host) => !host.isFixed);

  const originalOrganizer = booking.user;

  const attendeeEmailsSet = new Set(booking.attendees.map((attendee) => attendee.email));

  // Find the current round robin host assigned
  const previousRRHost = (() => {
    for (const host of roundRobinHosts) {
      if (host.user.id === booking.userId) {
        return host.user;
      }
      if (attendeeEmailsSet.has(host.user.email)) {
        return host.user;
      }
    }
  })();

  const previousRRHostT = await getTranslation(previousRRHost?.locale || "en", "common");

  const eventTypeHosts = await enrichHostsWithDelegationCredentials({
    orgId,
    hosts: eventType.hosts,
  });
  // Filter out the current attendees of the booking from the event type
  const availableEventTypeUsers = eventTypeHosts.reduce((availableUsers, host) => {
    if (!attendeeEmailsSet.has(host.user.email) && host.user.email !== originalOrganizer.email) {
      availableUsers.push({ ...host.user, isFixed: host.isFixed, priority: host?.priority ?? 2 });
    }
    return availableUsers;
  }, [] as IsFixedAwareUser[]);

  const availableUsers = await ensureAvailableUsers(
    { ...eventType, users: availableEventTypeUsers },
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: eventType.timeZone || originalOrganizer.timeZone,
    },
    roundRobinReassignLogger
  );
  const luckyUserService = getLuckyUserService();
  const reassignedRRHost = await luckyUserService.getLuckyUser({
    availableUsers,
    eventType,
    allRRHosts: eventTypeHosts.filter((host) => !host.isFixed), // todo: only use hosts from virtual queue
    routingFormResponse: null,
  });

  const hasOrganizerChanged = !previousRRHost || booking.userId === previousRRHost?.id;
  const organizer = hasOrganizerChanged ? reassignedRRHost : booking.user;
  const organizerT = await getTranslation(organizer?.locale || "en", "common");

  const currentBookingTitle = booking.title;
  let newBookingTitle = currentBookingTitle;

  const reassignedRRHostT = await getTranslation(reassignedRRHost.locale || "en", "common");

  const teamMembers = await getTeamMembers({
    eventTypeHosts: eventType.hosts,
    attendees: booking.attendees,
    organizer: organizer,
    previousHost: previousRRHost || null,
    reassignedHost: reassignedRRHost,
  });

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    if (
      attendee.email === reassignedRRHost.email ||
      attendee.email === previousRRHost?.email ||
      teamMembers.some((member) => member.email === attendee.email)
    ) {
      continue;
    }

    attendeePromises.push(
      getTranslation(attendee.locale ?? "en", "common").then((tAttendee) => ({
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        language: { translate: tAttendee, locale: attendee.locale ?? "en" },
        phoneNumber: attendee.phoneNumber || undefined,
      }))
    );
  }

  const attendeeList = await Promise.all(attendeePromises);
  let bookingLocation = booking.location;

  if (hasOrganizerChanged) {
    const bookingResponses = booking.responses;

    const responseSchema = getBookingResponsesPartialSchema({
      bookingFields: eventType.bookingFields,
      view: "reschedule",
    });

    const responseSafeParse = await responseSchema.safeParseAsync(bookingResponses);

    const responses = responseSafeParse.success ? responseSafeParse.data : undefined;

    if (eventType.locations.some((location) => location.type === OrganizerDefaultConferencingAppType)) {
      const organizerMetadataSafeParse = userMetadataSchema.safeParse(reassignedRRHost.metadata);

      const defaultLocationUrl = organizerMetadataSafeParse.success
        ? organizerMetadataSafeParse?.data?.defaultConferencingApp?.appLink
        : undefined;

      const currentBookingLocation = booking.location || "integrations:daily";

      bookingLocation =
        defaultLocationUrl ||
        getLocationValueForDB(currentBookingLocation, eventType.locations).bookingLocation;
    }

    const eventNameObject = {
      attendeeName: responses?.name || "Nameless",
      eventType: eventType.title,
      eventName: eventType.eventName,
      // we send on behalf of team if >1 round robin attendee | collective
      teamName: teamMembers.length > 1 ? eventType.team?.name : null,
      // TODO: Can we have an unnamed organizer? If not, I would really like to throw an error here.
      host: organizer.name || "Nameless",
      location: bookingLocation || "integrations:daily",
      bookingFields: { ...responses },
      eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
      t: organizerT,
    };

    newBookingTitle = getEventName(eventNameObject);

    booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: reassignedRRHost.id,
        userPrimaryEmail: reassignedRRHost.email,
        title: newBookingTitle,
        reassignById: reassignedById,
        idempotencyKey: IdempotencyKeyService.generate({
          startTime: booking.startTime,
          endTime: booking.endTime,
          userId: reassignedRRHost.id,
          reassignedById,
        }),
      },
      select: bookingSelect,
    });
  } else {
    const previousRRHostAttendee = booking.attendees.find(
      (attendee) => attendee.email === previousRRHost.email
    );
    await prisma.attendee.update({
      where: {
        id: previousRRHostAttendee!.id,
      },
      data: {
        name: reassignedRRHost.name || "",
        email: reassignedRRHost.email,
        timeZone: reassignedRRHost.timeZone,
        locale: reassignedRRHost.locale,
      },
    });
  }

  roundRobinReassignLogger.info(`Successfully reassigned to user ${reassignedRRHost.id}`);

  await AssignmentReasonRecorder.roundRobinReassignment({
    bookingId,
    reassignById: reassignedById,
    reassignmentType: RRReassignmentType.ROUND_ROBIN,
  });

  const destinationCalendar = await getDestinationCalendar({
    eventType,
    booking,
    newUserId: reassignedRRHost.id,
    hasOrganizerChanged,
  });

  // If changed owner, also change destination calendar
  const previousHostDestinationCalendar = hasOrganizerChanged
    ? await prisma.destinationCalendar.findFirst({
        where: {
          userId: originalOrganizer.id,
        },
      })
    : null;

  const evt: CalendarEvent = {
    organizer: {
      name: organizer.name || "",
      email: organizer.email,
      language: {
        locale: organizer.locale || "en",
        translate: organizerT,
      },
      timeZone: organizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
    },
    startTime: dayjs(booking.startTime).utc().format(),
    endTime: dayjs(booking.endTime).utc().format(),
    type: eventType.slug,
    title: newBookingTitle,
    description: eventType.description,
    attendees: attendeeList,
    uid: booking.uid,
    iCalUID: booking.iCalUID,
    destinationCalendar,
    team: {
      members: teamMembers,
      name: eventType.team?.name || "",
      id: eventType.team?.id || 0,
    },
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({
      bookingFields: eventType?.bookingFields ?? null,
      booking,
    }),
    hideOrganizerEmail: eventType.hideOrganizerEmail,
    customReplyToEmail: eventType?.customReplyToEmail,
    location: bookingLocation,
    ...(platformClientParams ? platformClientParams : {}),
  };

  if (hasOrganizerChanged) {
    // location might changed and will be new created in eventManager.create (organizer default location)
    evt.videoCallData = undefined;
    // To prevent "The requested identifier already exists" error while updating event, we need to remove iCalUID
    evt.iCalUID = undefined;
  }
  const credentials = await prisma.credential.findMany({
    where: {
      userId: organizer.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const organizerWithCredentials = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...organizer, credentials },
  });

  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);

  // remove the event and meeting using the old host's credentials
  if (hasOrganizerChanged && originalOrganizer.id !== reassignedRRHost.id) {
    const previousHostCredentials = await getAllCredentialsIncludeServiceAccountKey(
      originalOrganizer,
      eventType
    );
    const originalHostEventManager = new EventManager(
      { ...originalOrganizer, credentials: previousHostCredentials },
      apps
    );

    const originalOrganizerT = await getTranslation(originalOrganizer.locale || "en", "common");

    const deletionEvent: CalendarEvent = {
      ...evt,
      organizer: {
        id: originalOrganizer.id,
        name: originalOrganizer.name || "",
        email: originalOrganizer.email,
        username: originalOrganizer.username || undefined,
        timeZone: originalOrganizer.timeZone,
        language: { translate: originalOrganizerT, locale: originalOrganizer.locale ?? "en" },
        timeFormat: getTimeFormatStringFromUserTimeFormat(originalOrganizer.timeFormat),
      },
      destinationCalendar: previousHostDestinationCalendar ? [previousHostDestinationCalendar] : [],
      title: booking.title,
    };

    await originalHostEventManager.deleteEventsAndMeetings({
      event: deletionEvent,
      bookingReferences: booking.references,
    });
  }

  const { evtWithAdditionalInfo } = await handleRescheduleEventManager({
    evt,
    rescheduleUid: booking.uid,
    newBookingId: undefined,
    changedOrganizer: hasOrganizerChanged,
    previousHostDestinationCalendar: previousHostDestinationCalendar ? [previousHostDestinationCalendar] : [],
    initParams: {
      user: organizerWithCredentials,
      eventType,
    },
    bookingId,
    bookingLocation,
    bookingICalUID: booking.iCalUID,
    bookingMetadata: booking.metadata,
  });

  const { cancellationReason: _cancellationReason, ...evtWithoutCancellationReason } = evtWithAdditionalInfo;

  // Send to new RR host
  if (emailsEnabled) {
    await sendRoundRobinScheduledEmailsAndSMS({
      calEvent: evtWithoutCancellationReason,
      members: [
        {
          ...reassignedRRHost,
          name: reassignedRRHost.name || "",
          username: reassignedRRHost.username || "",
          timeFormat: getTimeFormatStringFromUserTimeFormat(reassignedRRHost.timeFormat),
          language: { translate: reassignedRRHostT, locale: reassignedRRHost.locale || "en" },
        },
      ],
      reassigned: {
        name: reassignedRRHost.name,
        email: reassignedRRHost.email,
        byUser: originalOrganizer.name || undefined,
      },
    });
  }

  if (previousRRHost) {
    // Send to cancelled RR host
    // First we need to replace the new RR host with the old RR host in the evt object
    const cancelledRRHostEvt = cloneDeep(evtWithAdditionalInfo);
    cancelledRRHostEvt.title = currentBookingTitle;
    if (hasOrganizerChanged) {
      cancelledRRHostEvt.organizer = {
        name: previousRRHost.name || "",
        email: previousRRHost.email,
        language: {
          locale: previousRRHost.locale || "en",
          translate: previousRRHostT,
        },
        timeZone: previousRRHost.timeZone,
        timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
      };
    } else if (cancelledRRHostEvt.team) {
      // Filter out the new RR host from attendees and add the old RR host
      const newMembersArray = cancelledRRHostEvt.team?.members || [];
      cancelledRRHostEvt.team.members = newMembersArray.filter(
        (member) => member.email !== reassignedRRHost.email
      );
      cancelledRRHostEvt.team.members.unshift({
        id: previousRRHost.id,
        email: previousRRHost.email,
        name: previousRRHost.name || "",
        timeZone: previousRRHost.timeZone,
        language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
      });
    }

    if (emailsEnabled) {
      await sendRoundRobinReassignedEmailsAndSMS({
        calEvent: cancelledRRHostEvt,
        members: [
          {
            ...previousRRHost,
            name: previousRRHost.name || "",
            username: previousRRHost.username || "",
            timeFormat: getTimeFormatStringFromUserTimeFormat(previousRRHost.timeFormat),
            language: { translate: previousRRHostT, locale: previousRRHost.locale || "en" },
          },
        ],
        reassignedTo: { name: reassignedRRHost.name, email: reassignedRRHost.email },
        eventTypeMetadata: eventType?.metadata as EventTypeMetadata,
      });
    }
  }

  // Handle changing workflows with organizer
  if (hasOrganizerChanged) {
    if (emailsEnabled && dayjs(evt.startTime).isAfter(dayjs())) {
      // send email with event updates to attendees
      await sendRoundRobinUpdatedEmailsAndSMS({
        calEvent: evtWithoutCancellationReason,
        eventTypeMetadata: eventType?.metadata as EventTypeMetadata,
      });
    }

    await handleWorkflowsUpdate({
      booking,
      newUser: reassignedRRHost,
      evt: evtWithAdditionalInfo,
      eventType,
      orgId,
    });
  }

  return {
    bookingId,
    reassignedTo: {
      id: reassignedRRHost.id,
      name: reassignedRRHost.name,
      email: reassignedRRHost.email,
    },
  };
};

export default roundRobinReassignment;