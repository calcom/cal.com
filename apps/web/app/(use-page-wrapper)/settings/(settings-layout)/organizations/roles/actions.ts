"use server";

import { revalidatePath } from "next/cache";

export async function revalidateTeamRoles() {
  revalidatePath("/settings/organizations/roles");
}
