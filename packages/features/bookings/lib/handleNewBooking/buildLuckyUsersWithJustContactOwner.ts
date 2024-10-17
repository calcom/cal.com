import type { loadAndValidateUsers } from "./loadAndValidateUsers";
import type { IsFixedAwareUser } from "./types";

/**
 * Adds the contact owner to be the only lucky user
 * @returns
 */
export function buildLuckyUsersWithJustContactOwner({
  contactOwnerEmail,
  availableUsers,
  fixedUserPool,
}: {
  contactOwnerEmail: string | null;
  availableUsers: IsFixedAwareUser[];
  fixedUserPool: IsFixedAwareUser[];
}) {
  const luckyUsers: Awaited<ReturnType<typeof loadAndValidateUsers>> = [];
  if (!contactOwnerEmail) {
    return luckyUsers;
  }

  const isContactOwnerAFixedHostAlready = fixedUserPool.some((user) => user.email === contactOwnerEmail);
  if (isContactOwnerAFixedHostAlready) {
    return luckyUsers;
  }

  const teamMember = availableUsers.find((user) => user.email === contactOwnerEmail);
  if (teamMember) {
    luckyUsers.push(teamMember);
  }
  return luckyUsers;
}
