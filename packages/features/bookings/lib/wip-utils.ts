import type { DestinationCalendar, User } from "@prisma/client";

// eslint-disable-next-line no-restricted-imports
import processExternalId from "@calcom/app-store/_utils/calendars/processExternalId";
import { getLocationValueForDB, OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getEventName } from "@calcom/lib/event";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { SchedulingType } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { getCustomInputsResponses } from "./handleNewBooking/getCustomInputsResponses";
import { getLocationValuesForDb } from "./handleNewBooking/getLocationValuesForDb";
import type { BookingType } from "./handleNewBooking/originalRescheduledBookingUtils";

export type UserForBuildingEvent = Pick<User, "id" | "name" | "timeZone" | "locale" | "email"> & {
  destinationCalendar: DestinationCalendar | null;
  isFixed?: boolean;
};

export const getDestinationCalendar = ({
  eventType,
  organizerUser,
}: {
  eventType: {
    destinationCalendar: DestinationCalendar | null;
  };
  organizerUser: {
    destinationCalendar: DestinationCalendar | null;
  };
}) => {
  const destinationCalendar = eventType.destinationCalendar
    ? [eventType.destinationCalendar]
    : organizerUser.destinationCalendar
    ? [organizerUser.destinationCalendar]
    : null;
  return destinationCalendar;
};

export const buildEventForTeamEventType = async ({
  existingEvent: evt,
  users,
  organizerUser,
  schedulingType,
  team,
}: {
  existingEvent: Partial<CalendarEvent>;
  users: UserForBuildingEvent[];
  organizerUser: { email: string };
  schedulingType: SchedulingType | null;
  team?: {
    id: number;
    name: string;
  } | null;
}) => {
  // not null assertion.
  if (!schedulingType) {
    throw new Error("Scheduling type is required for team event type");
  }
  const teamDestinationCalendars: DestinationCalendar[] = [];
  const fixedUsers = users.filter((user) => user.isFixed);
  const nonFixedUsers = users.filter((user) => !user.isFixed);
  const filteredUsers =
    schedulingType === SchedulingType.ROUND_ROBIN
      ? [...fixedUsers, ...(nonFixedUsers.length > 0 ? [nonFixedUsers[0]] : [])]
      : users;

  // Organizer or user owner of this event type it's not listed as a team member.
  const teamMemberPromises = filteredUsers
    .filter((user) => user.email !== organizerUser.email)
    .map(async (user) => {
      // TODO: Add back once EventManager tests are ready https://github.com/calcom/cal.com/pull/14610#discussion_r1567817120
      // push to teamDestinationCalendars if it's a team event but collective only
      if (schedulingType === "COLLECTIVE" && user.destinationCalendar) {
        teamDestinationCalendars.push({
          ...user.destinationCalendar,
          externalId: processExternalId(user.destinationCalendar),
        });
      }

      return {
        id: user.id,
        email: user.email ?? "",
        name: user.name ?? "",
        firstName: "",
        lastName: "",
        timeZone: user.timeZone,
        language: {
          translate: await getTranslation(user.locale ?? "en", "common"),
          locale: user.locale ?? "en",
        },
      };
    });

  const teamMembers = await Promise.all(teamMemberPromises);

  evt = CalendarEventBuilder.fromEvent(evt)
    .withDestinationCalendar([...(evt.destinationCalendar ?? []), ...teamDestinationCalendars])
    .build();

  return CalendarEventBuilder.fromEvent(evt)
    .withTeam({
      members: teamMembers,
      name: team?.name || "Nameless",
      id: team?.id ?? 0,
    })
    .build();
};

export async function buildEvent({
  eventType,
  organizerUser,
  organizerEmail,
  attendeesList,
  bookerUrl,
  platformBookingLocation,
  bookingLocation,
  conferenceCredentialId,
  destinationCalendar,
  tOrganizer,
  isConfirmedByDefault,
  iCalUID,
  iCalSequence,
  platformClientId,
  platformRescheduleUrl,
  platformCancelUrl,
  platformBookingUrl,
  bookingData,
  isTeamEventType,
  users,
  fullName,
}: {
  eventType: any;
  organizerUser: any;
  organizerEmail: any;
  attendeesList: any;
  bookerUrl: any;
  platformBookingLocation: any;
  bookingLocation: any;
  conferenceCredentialId: any;
  destinationCalendar: any;
  tOrganizer: any;
  isConfirmedByDefault: any;
  iCalUID: any;
  iCalSequence: any;
  platformClientId: any;
  platformRescheduleUrl: any;
  platformCancelUrl: any;
  platformBookingUrl: any;
  bookingData: any;
  isTeamEventType: boolean;
  users: any[];
  fullName: string;
}) {
  console.log("buildEventCalledWith", {
    eventType,
    organizerUser,
    organizerEmail,
    attendeesList,
    bookingData,
  });
  const { responses, notes: additionalNotes } = bookingData;
  const reqBody = bookingData;
  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);
  const evtName = !eventType?.isDynamic ? eventType.eventName : responses?.title;
  const eventNameObject = {
    //TODO: Can we have an unnamed attendee? If not, I would really like to throw an error here.
    attendeeName: fullName || "Nameless",
    eventType: eventType.title,
    eventName: evtName,
    // we send on behalf of team if >1 round robin attendee | collective
    teamName: eventType.schedulingType === "COLLECTIVE" || users.length > 1 ? eventType.team?.name : null,
    // TODO: Can we have an unnamed organizer? If not, I would really like to throw an error here.
    host: organizerUser.name || "Nameless",
    location: bookingLocation,
    eventDuration: dayjs(reqBody.end).diff(reqBody.start, "minutes"),
    bookingFields: { ...responses },
    t: tOrganizer,
  };
  const eventName = getEventName(eventNameObject);

  let evt: CalendarEvent = new CalendarEventBuilder()
    .withBasicDetails({
      bookerUrl,
      title: eventName,
      startTime: dayjs(reqBody.start).utc().format(),
      endTime: dayjs(reqBody.end).utc().format(),
      additionalNotes,
    })
    .withEventType({
      slug: eventType.slug,
      description: eventType.description,
      id: eventType.id,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      schedulingType: eventType.schedulingType,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      // if seats are not enabled we should default true
      seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
      seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
      customReplyToEmail: eventType.customReplyToEmail,
    })
    .withOrganizer({
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerEmail,
      username: organizerUser.username || undefined,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    })
    .withAttendees(attendeesList)
    .withMetadataAndResponses({
      additionalNotes,
      customInputs,
      responses: reqBody.calEventResponses || null,
      userFieldsResponses: reqBody.calEventUserFieldsResponses || null,
    })
    .withLocation({
      location: platformBookingLocation ?? bookingLocation, // Will be processed by the EventManager later.
      conferenceCredentialId,
    })
    .withDestinationCalendar(destinationCalendar)
    .withIdentifiers({ iCalUID, iCalSequence })
    .withConfirmation({
      requiresConfirmation: !isConfirmedByDefault,
      isConfirmedByDefault,
    })
    .withPlatformVariables({
      platformClientId,
      platformRescheduleUrl,
      platformCancelUrl,
      platformBookingUrl,
    })
    .build();

  if (reqBody.recurringEventId && eventType.recurringEvent) {
    evt.recurringEvent = eventType.recurringEvent;
  }

  if (bookingData.thirdPartyRecurringEventId) {
    evt = CalendarEventBuilder.fromEvent(evt)
      .withRecurringEventId(bookingData.thirdPartyRecurringEventId)
      .build();
  }

  if (isTeamEventType) {
    evt = await buildEventForTeamEventType({
      existingEvent: evt,
      schedulingType: eventType.schedulingType,
      users,
      team: eventType.team,
      organizerUser,
    });
  }

  return { evt, eventNameObject, eventName };
}

export function getICalSequence(originalRescheduledBooking: BookingType | null) {
  // If new booking set the sequence to 0
  if (!originalRescheduledBooking) {
    return 0;
  }

  // If rescheduling and there is no sequence set, assume sequence should be 1
  if (!originalRescheduledBooking.iCalSequence) {
    return 1;
  }

  // If rescheduling then increment sequence by 1
  return originalRescheduledBooking.iCalSequence + 1;
}

export const decideLocation = ({
  dynamicUserList,
  users,
  location,
  eventType,
  organizerUser,
  isManagedEventType,
  isTeamEventType,
}) => {
  let { locationBodyString, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } = getLocationValuesForDb({
    dynamicUserList,
    users,
    location,
  });

  // If location passed is empty , use default location of event
  // If location of event is not set , use host default
  if (locationBodyString.trim().length == 0) {
    if (eventType.locations.length > 0) {
      locationBodyString = eventType.locations[0].type;
    } else {
      locationBodyString = OrganizerDefaultConferencingAppType;
    }
  }

  // use host default
  if (locationBodyString == OrganizerDefaultConferencingAppType) {
    const metadataParseResult = userMetadataSchema.safeParse(organizerUser.metadata);
    const organizerMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;
    if (organizerMetadata?.defaultConferencingApp?.appSlug) {
      const app = getAppFromSlug(organizerMetadata?.defaultConferencingApp?.appSlug);
      locationBodyString = app?.appData?.location?.type || locationBodyString;
      if (isManagedEventType || isTeamEventType) {
        organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
          organizerMetadata?.defaultConferencingApp?.appLink;
      }
    } else if (organizationDefaultLocation) {
      locationBodyString = organizationDefaultLocation;
    } else {
      locationBodyString = "integrations:daily";
    }
  }

  // For static link based video apps, it would have the static URL value instead of it's type(e.g. integrations:campfire_video)
  // This ensures that createMeeting isn't called for static video apps as bookingLocation becomes just a regular value for them.
  const { bookingLocation, conferenceCredentialId } = organizerOrFirstDynamicGroupMemberDefaultLocationUrl
    ? {
        bookingLocation: organizerOrFirstDynamicGroupMemberDefaultLocationUrl,
        conferenceCredentialId: undefined,
      }
    : getLocationValueForDB(locationBodyString, eventType.locations);
  logger.info("locationBodyString", locationBodyString);
  logger.info("event type locations", eventType.locations);
  return { bookingLocation, conferenceCredentialId };
};

export const getOrgIdAndTeamIdForEventType = async ({ eventType }: { eventType: any }) => {
  const teamId = await getTeamIdFromEventType({ eventType });

  const triggerForUser = !teamId || (teamId && eventType.parentId);

  const organizerUserId = triggerForUser ? organizerUser.id : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });
  return { teamId, orgId };
};
