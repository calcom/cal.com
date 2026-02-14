import { enrichHostsWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RRResetInterval } from "@calcom/prisma/client";
import type { RRTimestampBasis } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import type { CredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["[getRoutedUsers]"] });

export const getRoutedUsersWithContactOwnerAndFixedUsers = <
  T extends { id: number; isFixed?: boolean; email: string },
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
  uuid: string;
  email: string;
};

type BaseHost<User extends BaseUser> = {
  isFixed: boolean;
  createdAt: Date;
  priority?: number | null;
  weight?: number | null;
  weightAdjustment?: number | null;
  user: User;
  groupId: string | null;
};

export type EventType = {
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  rrSegmentQueryValue: AttributesQueryValue | null | undefined;
  team: {
    id: number;
    parentId: number | null;
    rrResetInterval: RRResetInterval | null;
    rrTimestampBasis: RRTimestampBasis;
  } | null;
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
        groupId: host.groupId,
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
          groupId: null,
        };
      }),
    };
  }
}
type BaseUserWithCredentialPayload = BaseUser & { credentials: CredentialPayload[] };
export async function getNormalizedHostsWithDelegationCredentials<
  User extends BaseUserWithCredentialPayload,
  Host extends BaseHost<User>,
>({
  eventType,
}: {
  eventType: {
    schedulingType: SchedulingType | null;
    hosts?: Host[];
    users: User[];
    teamId?: number;
  };
}) {
  if (eventType.hosts?.length && eventType.schedulingType) {
    const hostsWithoutDelegationCredential = eventType.hosts.map((host) => ({
      isFixed: host.isFixed,
      user: host.user,
      priority: host.priority,
      weight: host.weight,
      createdAt: host.createdAt,
      groupId: host.groupId,
    }));
    const firstHost = hostsWithoutDelegationCredential[0];
    const firstUserOrgId = await getOrgIdFromMemberOrTeamId({
      memberId: firstHost?.user?.id ?? null,
      teamId: eventType.teamId,
    });
    const hostsEnrichedWithDelegationCredential = await enrichHostsWithDelegationCredentials({
      orgId: firstUserOrgId ?? null,
      hosts: hostsWithoutDelegationCredential ?? null,
    });
    return {
      hosts: hostsEnrichedWithDelegationCredential,
      fallbackHosts: null,
    };
  } else {
    const hostsWithoutDelegationCredential = eventType.users.map((user) => {
      return {
        isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
        email: user.email,
        user: user,
        createdAt: null,
      };
    });
    const firstHost = hostsWithoutDelegationCredential[0];
    const firstUserOrgId = await getOrgIdFromMemberOrTeamId({
      memberId: firstHost?.user?.id ?? null,
      teamId: eventType.teamId,
    });
    const hostsEnrichedWithDelegationCredential = await enrichHostsWithDelegationCredentials({
      orgId: firstUserOrgId ?? null,
      hosts: hostsWithoutDelegationCredential ?? null,
    });
    return {
      hosts: null,
      fallbackHosts: hostsEnrichedWithDelegationCredential,
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
    groupId: string | null;
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
