import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

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
