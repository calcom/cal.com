import { safeStringify } from "@calcom/lib/safeStringify";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[getHostsMatchingTeamMemberIdsIncludingFixed]"] });

export const getHostsMatchingTeamMemberIdsIncludingFixed = <T extends { user: { id: number }; isFixed?: boolean }>({
  teamMemberIds,
  hosts,
}: {
  teamMemberIds: number[] | undefined | null;
  hosts: T[];
}) => {
  // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no teamMemberIds are provided
  if (!teamMemberIds || !teamMemberIds.length) {
    return hosts;
  }

  log.debug("filtering hosts as per teamMemberIds", safeStringify({ teamMemberIds }));
  return hosts.filter((host) => teamMemberIds.includes(host.user.id) || host.isFixed);
};

export const getUsersMatchingTeamMemberIdsIncludingFixed = <T extends { id: number; isFixed?: boolean }>({
  teamMemberIds,
  users,
}: {
  teamMemberIds: number[] | undefined | null;
  users: T[];
}) => {
 // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no teamMemberIds are provided
  if (!teamMemberIds || !teamMemberIds.length) {
    return users;
  }

  log.debug("filtering users as per teamMemberIds", safeStringify({ teamMemberIds }));
  return users.filter((user) => teamMemberIds.includes(user.id) || user.isFixed);
};
