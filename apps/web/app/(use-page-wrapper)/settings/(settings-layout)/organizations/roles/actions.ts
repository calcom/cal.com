"use server";

import { revalidatePath, updateTag } from "next/cache";

export async function revalidateTeamRoles(teamId: number) {
  // Revalidate organization roles path
  revalidatePath("/settings/organizations/roles");

  // Revalidate team roles paths (dynamic routes)
  revalidatePath("/settings/teams/[id]/roles", "page");

  // Invalidate cache tags that match the unstable_cache keys
  updateTag("team-roles");
  updateTag("resource-permissions");
  updateTag("team-feature");

  // Also invalidate team-specific cache tags for completeness
  updateTag(`team-roles-${teamId}`);
  updateTag(`resource-permissions-${teamId}`);
  updateTag(`team-members-${teamId}`);
  updateTag(`team-features-${teamId}`);
}
