"use server";

import { revalidatePath } from "next/cache";

export async function revalidateTeamRoles() {
  // Revalidate organization roles path
  revalidatePath("/settings/organizations/roles");

  // Revalidate team roles paths (dynamic routes)
  revalidatePath("/settings/teams/[id]/roles", "page");
}
