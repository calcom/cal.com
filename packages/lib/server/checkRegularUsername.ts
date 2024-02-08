import slugify from "@calcom/lib/slugify";

import { ProfileRepository } from "./repository/profile";

export async function checkRegularUsername(_username: string, currentOrgDomain?: string | null) {
  const username = slugify(_username);
  const premium = !!process.env.NEXT_PUBLIC_IS_E2E && username.length < 5;

  const profiles = currentOrgDomain
    ? await ProfileRepository.findManyByOrgSlugOrRequestedSlug({
        orgSlug: currentOrgDomain,
        usernames: [username],
      })
    : null;

  const user = profiles ? profiles[0].user : null;

  if (user) {
    return {
      available: false as const,
      premium,
      message: "A user exists with that username",
    };
  }
  return {
    available: true as const,
    premium,
  };
}
