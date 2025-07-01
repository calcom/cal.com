"use server";

import { revalidatePath } from "next/cache";

export async function revalidateAvailabilityList() {
  revalidatePath("/availability");
}
