"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsMembersList() {
  revalidatePath("/settings/organizations/members");
}
