"use server";

import { revalidatePath } from "next/cache";

export async function revalidateMembersList(orgSlug: string) {
  revalidatePath(`/settings/organizations/${orgSlug}/members`);
}
