import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { ProfileRepository } from "./repository/profile";
import { isUsernameReservedDueToMigration } from "./username";

export async function checkRegularUsername(_username: string, currentOrgDomain?: string | null) {
  const isCheckingUsernameInGlobalNamespace = !currentOrgDomain;
  const username = slugify(_username);

  const premium = !!process.env.NEXT_PUBLIC_IS_E2E && username.length < 5;

  const profiles = currentOrgDomain
    ? await ProfileRepository.findManyByOrgSlugOrRequestedSlug({
        orgSlug: currentOrgDomain,
        usernames: [username],
      })
    : null;

  const user = profiles?.length ? profiles[0].user : null;

  if (user) {
    return {
      available: false as const,
      premium,
      message: "A user exists with that username",
    };
  }

  // When checking in global namespace, we need to check if username exists in users table
  if (isCheckingUsernameInGlobalNamespace) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        organizationId: null,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (existingUser) {
      return {
        available: false as const,
        premium,
        message: "A user exists with that username",
      };
    }
  }

  const isUsernameAvailable = isCheckingUsernameInGlobalNamespace
    ? !(await isUsernameReservedDueToMigration(username))
    : true;

  return {
    available: isUsernameAvailable,
    premium,
  };
}
