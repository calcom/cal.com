import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["[getRoutedUsers]"] });

export const getRoutedHosts = <T extends { user: { id: number }; isFixed?: boolean }>({
  routedTeamMemberIds,
  hosts,
}: {
  routedTeamMemberIds: number[] | null;
  hosts: T[];
}) => {
  // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no routedTeamMemberIds are provided
  if (!routedTeamMemberIds || !routedTeamMemberIds.length) {
    return hosts;
  }

  log.debug("filtering hosts as per routedTeamMemberIds", safeStringify({ routedTeamMemberIds }));
  return hosts.filter((host) => routedTeamMemberIds.includes(host.user.id) || host.isFixed);
};

export const getRoutedUsers = <T extends { id: number; isFixed?: boolean }>({
  routedTeamMemberIds,
  users,
}: {
  routedTeamMemberIds: number[] | null;
  users: T[];
}) => {
  // We don't want to enter a scenario where we have no team members to be booked
  // So, let's just fallback to regular flow if no routedTeamMemberIds are provided
  if (!routedTeamMemberIds || !routedTeamMemberIds.length) {
    return users;
  }

  log.debug("filtering users as per routedTeamMemberIds", safeStringify({ routedTeamMemberIds }));
  return users.filter((user) => routedTeamMemberIds.includes(user.id) || user.isFixed);
};
