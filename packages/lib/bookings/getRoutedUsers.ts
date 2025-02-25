import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SchedulingType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[getRoutedUsers]"] });

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

  if (!eventType.team || !eventType.team.parentId) {
    return null;
  }

  const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic({
    attributesQueryValue: eventType.rrSegmentQueryValue ?? null,
    teamId: eventType.team.id,
    orgId: eventType.team.parentId,
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

export type EventType = {
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  rrSegmentQueryValue: AttributesQueryValue | null | undefined;
  team: { id: number; parentId: number | null } | null;
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

// We don't allow fixed hosts when segment matching is enabled
// If this ever changes, we need to update this function and return fixed hosts
export async function findMatchingHostsWithEventSegment<User extends BaseUser>({
  eventType,
  hosts,
}: {
  eventType: EventType;
  hosts: {
    isFixed: boolean;
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
  const segmentedRoundRobinHosts = hosts.filter((host) => {
    if (!matchingRRTeamMembers) return true;
    return matchingRRTeamMembers.includes(host.user.id);
  });
  return segmentedRoundRobinHosts;
}
