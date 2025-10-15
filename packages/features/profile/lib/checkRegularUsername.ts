import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";

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

  const isUsernameAvailable = isCheckingUsernameInGlobalNamespace
    ? !(await isUsernameReservedDueToMigration(username))
    : true;

  return {
    available: isUsernameAvailable,
    premium,
  };
}
