import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SchedulingType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[getRoutedUsers]"] });

export const getRoutedHostsWithContactOwnerAndFixedHosts = <
  T extends { user: { id: number; email: string }; isFixed?: boolean }
>({
  routedTeamMemberIds,
  hosts,
  contactOwnerEmail,
}: {
  routedTeamMemberIds: number[] | null;
  hosts: T[];
  contactOwnerEmail: string | null;
}) => {
  // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no routedTeamMemberIds are provided
  if (!routedTeamMemberIds || !routedTeamMemberIds.length) {
    return hosts;
  }

  log.debug(
    "filtering hosts as per routedTeamMemberIds",
    safeStringify({ routedTeamMemberIds, contactOwnerEmail })
  );
  return hosts.filter(
    (host) =>
      routedTeamMemberIds.includes(host.user.id) || host.isFixed || host.user.email === contactOwnerEmail
  );
};

export const getRoutedUsersWithContactOwnerAndFixedUsers = <
  T extends { id: number; isFixed?: boolean; email: string }
>({
  routedTeamMemberIds,
  users,
  contactOwnerEmail,
}: {
  routedTeamMemberIds: number[] | null;
  users: T[];
  contactOwnerEmail: string | null;
}) => {
  // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no routedTeamMemberIds are provided
  if (!routedTeamMemberIds || !routedTeamMemberIds.length) {
    return users;
  }

  log.debug(
    "filtering users as per routedTeamMemberIds",
    safeStringify({ routedTeamMemberIds, contactOwnerEmail })
  );
  return users.filter(
    (user) => routedTeamMemberIds.includes(user.id) || user.isFixed || user.email === contactOwnerEmail
  );
};

async function findMatchingTeamMembersIdsForEventRRSegment(eventType: EventType) {
  if (!eventType) {
    return null;
  }

  const isSegmentationDisabled = !eventType.assignAllTeamMembers || !eventType.assignRRMembersUsingSegment;

  if (isSegmentationDisabled) {
    return null;
  }

  if (!eventType.team) {
    return null;
  }

  const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic({
    attributesQueryValue: eventType.rrSegmentQueryValue ?? null,
    teamId: eventType.team.id,
  });
  if (!teamMembersMatchingAttributeLogic) {
    return teamMembersMatchingAttributeLogic;
  }
  return teamMembersMatchingAttributeLogic.map((member) => member.userId);
}

type BaseUser = {
  id: number;
  email: string;
};

type BaseHost<User extends BaseUser> = {
  isFixed: boolean;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
  weightAdjustment?: number | null;
  user: User;
};

type EventType = {
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  rrSegmentQueryValue: AttributesQueryValue | null | undefined;
  team: { id: number } | null;
};

export function getNormalizedHosts<User extends BaseUser, Host extends BaseHost<User>>({
  eventType,
}: {
  eventType: {
    schedulingType: SchedulingType | null;
    hosts?: Host[];
    users: User[];
  };
}) {
  if (eventType.hosts?.length && eventType.schedulingType) {
    return {
      hosts: eventType.hosts.map((host) => ({
        isFixed: host.isFixed,
        email: host.user.email,
        user: host.user,
        priority: host.priority,
        weight: host.weight,
        createdAt: host.createdAt,
      })),
      fallbackHosts: null,
    };
  } else {
    return {
      hosts: null,
      fallbackHosts: eventType.users.map((user) => {
        return {
          isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
          email: user.email,
          user: user,
          createdAt: null,
        };
      }),
    };
  }
}

export async function findMatchingHostsWithEventSegment<User extends BaseUser>({
  eventType,
  normalizedHosts,
}: {
  eventType: EventType;
  normalizedHosts: {
    isFixed: boolean;
    email: string;
    user: User;
    priority?: number | null;
    weight?: number | null;
    createdAt: Date | null;
  }[];
}) {
  const matchingRRTeamMembers = await findMatchingTeamMembersIdsForEventRRSegment({
    ...eventType,
    rrSegmentQueryValue: eventType.rrSegmentQueryValue ?? null,
  });

  const fixedHosts = normalizedHosts.filter((host) => host.isFixed);
  const unsegmentedRoundRobinHosts = normalizedHosts.filter((host) => !host.isFixed);

  const segmentedRoundRobinHosts = unsegmentedRoundRobinHosts.filter((host) => {
    if (!matchingRRTeamMembers) return true;
    return matchingRRTeamMembers.includes(host.user.id);
  });

  // In case we don't have any matching team members, we return all the RR hosts, as we always want the team event to be bookable.
  // TODO: We should notify about it to the organizer somehow.
  const roundRobinHosts = segmentedRoundRobinHosts.length
    ? segmentedRoundRobinHosts
    : unsegmentedRoundRobinHosts;

  return [...fixedHosts, ...roundRobinHosts];
}
