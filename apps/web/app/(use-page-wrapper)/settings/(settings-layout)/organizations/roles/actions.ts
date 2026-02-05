"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateTeamRoles(teamId: number) {
  // Revalidate organization roles path
  revalidatePath("/settings/organizations/roles");

  // Revalidate team roles paths (dynamic routes)
  revalidatePath("/settings/teams/[id]/roles", "page");

  // Invalidate cache tags that match the unstable_cache keys
  revalidateTag("team-roles", "max");
  revalidateTag("resource-permissions", "max");
  revalidateTag("team-feature", "max");

  // Also invalidate team-specific cache tags for completeness
  revalidateTag(`team-roles-${teamId}`, "max");
  revalidateTag(`resource-permissions-${teamId}`, "max");
  revalidateTag(`team-members-${teamId}`, "max");
  revalidateTag(`team-features-${teamId}`, "max");
}
