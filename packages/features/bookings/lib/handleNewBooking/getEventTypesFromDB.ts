import type { LocationObject } from "@calcom/app-store/locations";
import { workflowSelect } from "@calcom/ee/workflows/lib/getAllWorkflows";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseRecurringEvent } from "@calcom/lib";
import { withSelectedCalendars } from "@calcom/lib/server/repository/user";
import prisma, { userSelect } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import {
  EventTypeMetaDataSchema,
  customInputSchema,
  rrSegmentQueryValueSchema,
} from "@calcom/prisma/zod-utils";

const getBaseEventType = async (eventTypeId: number) => {
  return prisma.eventType.findUniqueOrThrow({
    where: { id: eventTypeId },
    select: {
      id: true,
      customInputs: true,
      disableGuests: true,
      slug: true,
      teamId: true,
      bookingFields: true,
      title: true,
      length: true,
      eventName: true,
      schedulingType: true,
      description: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodDays: true,
      periodCountCalendarDays: true,
      lockTimeZoneToggleOnBookingPage: true,
      requiresConfirmation: true,
      requiresConfirmationForFreeEmail: true,
      requiresBookerEmailVerification: true,
      maxLeadThreshold: true,
      minimumBookingNotice: true,
      userId: true,
      price: true,
      currency: true,
      metadata: true,
      destinationCalendar: true,
      hideCalendarNotes: true,
      hideCalendarEventDetails: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      bookingLimits: true,
      durationLimits: true,
      rescheduleWithSameRoundRobinHost: true,
      assignAllTeamMembers: true,
      isRRWeightsEnabled: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      parentId: true,
      useEventTypeDestinationCalendarEmail: true,
      locations: true,
      timeZone: true,
      assignRRMembersUsingSegment: true,
      rrSegmentQueryValue: true,
      useEventLevelSelectedCalendars: true,
    },
  });
};
const getEventTypeUsers = async (eventTypeId: number) => {
  const result = await prisma.user.findMany({
    where: {
      eventTypes: {
        some: {
          id: eventTypeId,
        },
      },
    },
    select: {
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
      ...userSelect.select,
    },
  });
  return result;
};

const getEventTypeHosts = async (eventTypeId: number) => {
  const result = await prisma.host.findMany({
    where: {
      eventTypeId: eventTypeId,
    },
    select: {
      isFixed: true,
      priority: true,
      weight: true,
      createdAt: true,
      user: {
        select: {
          credentials: {
            select: credentialForCalendarServiceSelect,
          },
          ...userSelect.select,
        },
      },
      schedule: {
        select: {
          availability: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
              days: true,
            },
          },
          timeZone: true,
          id: true,
        },
      },
    },
  });
  return result;
};

const getEventTypeTeamAndProfile = async (eventTypeId: number) => {
  // TODO: should we pass this info in from the baseEventType fetched or is this okay rehitting this table?
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      profileId: true,
      teamId: true,
      parentId: true,
    },
  });

  if (!eventType) throw new Error("Event type not found");

  const [profile, team, parent] = await Promise.all([
    eventType.profileId
      ? prisma.profile.findUnique({
          where: { id: eventType.profileId },
          select: {
            organizationId: true,
          },
        })
      : null,
    eventType.teamId
      ? prisma.team.findUnique({
          where: { id: eventType.teamId },
          select: {
            id: true,
            name: true,
            parentId: true,
            bookingLimits: true,
            includeManagedEventsInLimits: true,
          },
        })
      : null,
    eventType.parentId
      ? prisma.eventType.findUnique({
          where: { id: eventType.parentId },
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                bookingLimits: true,
                includeManagedEventsInLimits: true,
              },
            },
          },
        })
      : null,
  ]);

  return {
    profile,
    team,
    parent,
  };
};

const getEventTypeWorkflows = async (eventTypeId: number) => {
  const result = await prisma.workflow.findMany({
    where: {
      activeOn: {
        some: {
          id: eventTypeId,
        },
      },
    },
    select: workflowSelect,
  });
  return result;
};

// Update the main function to include workflows
export const getEventTypesFromDB = async (eventTypeId: number) => {
  const [baseEventType, users, hosts, teamData, _workflows] = await Promise.all([
    getBaseEventType(eventTypeId),
    getEventTypeUsers(eventTypeId),
    getEventTypeHosts(eventTypeId),
    getEventTypeTeamAndProfile(eventTypeId),
    getEventTypeWorkflows(eventTypeId),
  ]);

  const isOrgTeamEvent = !!teamData.team && !!teamData.profile?.organizationId;

  const hostsWithSelectedCalendars = hosts.map((host) => ({
    ...host,
    user: withSelectedCalendars(host.user),
  }));

  const usersWithSelectedCalendars = users.map((user) => withSelectedCalendars(user));

  // We need to match the return type that prisma returns for workflows when the query was merged
  const workflows = _workflows.map((workflow) => ({ workflow }));

  return {
    ...baseEventType,
    ...teamData,
    workflows,
    hosts: hostsWithSelectedCalendars,
    users: usersWithSelectedCalendars,
    metadata: EventTypeMetaDataSchema.parse(baseEventType?.metadata || {}),
    recurringEvent: parseRecurringEvent(baseEventType?.recurringEvent),
    customInputs: customInputSchema.array().parse(baseEventType?.customInputs || []),
    locations: (baseEventType?.locations ?? []) as LocationObject[],
    bookingFields: getBookingFieldsWithSystemFields({
      ...baseEventType,
      isOrgTeamEvent,
      workflows,
    }),
    rrSegmentQueryValue: rrSegmentQueryValueSchema.parse(baseEventType.rrSegmentQueryValue) ?? null,
    isDynamic: false,
  };
};

export type getEventTypeResponse = Awaited<ReturnType<typeof getEventTypesFromDB>>;
