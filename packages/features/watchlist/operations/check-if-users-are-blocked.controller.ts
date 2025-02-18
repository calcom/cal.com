import { startSpan } from "@sentry/nextjs";

import { WatchlistRepository } from "../watchlist.repository";

function presenter(containsBlockedUser: boolean) {
  return startSpan({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, () => {
    return !!containsBlockedUser;
  });
}

export async function checkIfUsersAreBlocked(
  users: { email: string; username: string | null; locked: boolean }[]
): Promise<ReturnType<typeof presenter>> {
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

  const watchlistRepository = new WatchlistRepository();
  const blockedRecords = await watchlistRepository.searchForAllBlockedRecords({
    usernames: usernamesToCheck,
    emails: emailsToCheck,
    domains: domainsToCheck,
  });

  return presenter(blockedRecords.length > 0);
}
