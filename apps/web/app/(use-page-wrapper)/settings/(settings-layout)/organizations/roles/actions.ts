"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateTeamRoles() {
  // Revalidate organization roles path
  revalidatePath("/settings/organizations/roles");

  // Revalidate team roles paths (dynamic routes)
  revalidatePath("/settings/teams/[id]/roles", "page");

  // Revalidate specific cache tags used in team roles page
  revalidateTag("team-roles-for-team");
  revalidateTag("resource-permissions-for-team-roles");
  revalidateTag("team-with-members-for-roles");
}
