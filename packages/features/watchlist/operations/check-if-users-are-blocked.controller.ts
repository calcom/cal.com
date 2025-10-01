import { startSpan } from "@sentry/nextjs";

import { getWatchlistReadRepository } from "@calcom/lib/di/watchlist/containers/watchlist";

import type { UsersBlockedCheckResponseDTO } from "../lib/dto";

function presenter(containsBlockedUser: boolean): UsersBlockedCheckResponseDTO {
  return startSpan({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, () => {
    return { containsBlockedUser };
  });
}

export async function checkIfUsersAreBlocked(
  users: { email: string; username: string | null; locked: boolean }[]
): Promise<UsersBlockedCheckResponseDTO> {
  const usernamesToCheck = [],
    emailsToCheck = [],
    domainsToCheck = [];

  for (const user of users) {
    // If any user is locked, then return true
    if (user.locked) return true;
    const emailDomain = user.email.split("@")[1];
    if (user.username) usernamesToCheck.push(user.username);
    emailsToCheck.push(user.email);
    domainsToCheck.push(emailDomain);
  }

  const watchlistRepository = getWatchlistReadRepository();
  const blockedRecords = await watchlistRepository.searchForAllBlockedRecords({
    usernames: usernamesToCheck,
    emails: emailsToCheck,
    domains: domainsToCheck,
  });

  return presenter(blockedRecords.length > 0);
}
