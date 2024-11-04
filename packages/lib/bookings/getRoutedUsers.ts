import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import logger from "@calcom/lib/logger";
import { AttributesQueryValue } from "@calcom/lib/raqb/types";
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

async function findMatchingTeamMembersIdsForEventRRSegment(eventType: {
  assignAllTeamMembers: boolean;
  assignTeamMembersInSegment: boolean;
  membersAssignmentSegmentQueryValue: AttributesQueryValue | null | undefined;
  schedulingType: SchedulingType | null;
  team: { id: number } | null;
}) {
  if (!eventType) {
    return null;
  }

  const isSegmentationDisabled = !eventType.assignAllTeamMembers || !eventType.assignTeamMembersInSegment;

  if (isSegmentationDisabled) {
    return null;
  }

  if (!eventType.team) {
    return null;
  }

  const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic({
    attributesQueryValue: eventType.membersAssignmentSegmentQueryValue ?? null,
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
  priority?: number | null;
  weight?: number | null;
  weightAdjustment?: number | null;
  user: User;
};

type EventType<Host extends BaseHost<User>, User extends BaseUser> = {
  assignAllTeamMembers: boolean;
  assignTeamMembersInSegment: boolean;
  membersAssignmentSegmentQueryValue: AttributesQueryValue | null | undefined;
  schedulingType: SchedulingType | null;
  team: { id: number } | null;
  users: User[];
  hosts: Host[];
};

export async function findMatchingHosts<User extends BaseUser, Host extends BaseHost<User>>({
  eventType,
}: {
  eventType: EventType<Host, User>;
}) {
  const matchingRRTeamMembers = await findMatchingTeamMembersIdsForEventRRSegment({
    ...eventType,
    membersAssignmentSegmentQueryValue: eventType.membersAssignmentSegmentQueryValue ?? null,
  });

  const eventHosts: {
    isFixed: boolean;
    email: string;
    user: Host["user"];
    priority?: Host["priority"];
    weight?: Host["weight"];
    weightAdjustment?: Host["weightAdjustment"];
  }[] =
    eventType.hosts?.length && eventType.schedulingType
      ? eventType.hosts.map((host) => ({
          isFixed: host.isFixed,
          email: host.user.email,
          user: host.user,
          priority: host.priority,
          weight: host.weight,
          weightAdjustment: host.weightAdjustment,
        }))
      : eventType.users.map((user) => {
          return {
            isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
            email: user.email,
            user: user,
          };
        });

  const fixedHosts = eventHosts.filter((host) => host.isFixed);
  const unsegmentedRoundRobinHosts = eventHosts.filter((host) => !host.isFixed);

  const segmentedRoundRobinHosts = unsegmentedRoundRobinHosts.filter((host) => {
    if (!matchingRRTeamMembers) return true;
    return matchingRRTeamMembers.includes(host.user.id);
  });

  console.log({ eventHosts, fixedHosts, segmentedRoundRobinHosts });

  // In case we don't have any matching team members, we return all the RR hosts, as we always want the team event to be bookable.
  // TODO: We should notify about it to the organizer somehow.
  const roundRobinHosts = segmentedRoundRobinHosts.length
    ? segmentedRoundRobinHosts
    : unsegmentedRoundRobinHosts;

  return [...fixedHosts, ...roundRobinHosts];
}
