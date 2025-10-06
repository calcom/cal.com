import { startSpan } from "@sentry/nextjs";

import { getGlobalBlockingService } from "@calcom/features/di/watchlist/containers/watchlist";

function presenter(containsBlockedUser: boolean) {
  return startSpan({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, () => {
    return !!containsBlockedUser;
  });
}

export async function checkIfUsersAreBlocked(
  users: { email: string; username: string | null; locked: boolean }[]
): Promise<ReturnType<typeof presenter>> {
  // If any user is locked, return true immediately
  if (users.some((user) => user.locked)) {
    return presenter(true);
  }

  // Only check global blocking since we don't have organizationId context in this bulk check
  const globalBlockingService = getGlobalBlockingService();

  // Check each user's email for global blocking
  for (const user of users) {
    const result = await globalBlockingService.isBlocked(user.email.toLowerCase());
    if (result.isBlocked) {
      return presenter(true);
    }
  }

  return presenter(false);
}
