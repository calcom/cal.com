"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateTeamRoles(teamId: number) {
  // Revalidate organization roles path
  revalidatePath("/settings/organizations/roles");

  // Revalidate team roles paths (dynamic routes)
  revalidatePath("/settings/teams/[id]/roles", "page");

  // Invalidate cache tags that match the unstable_cache keys
  revalidateTag("team-roles");
  revalidateTag("resource-permissions");
  revalidateTag("team-feature");

  // Also invalidate team-specific cache tags for completeness
  revalidateTag(`team-roles-${teamId}`);
  revalidateTag(`resource-permissions-${teamId}`);
  revalidateTag(`team-members-${teamId}`);
  revalidateTag(`team-features-${teamId}`);
}
