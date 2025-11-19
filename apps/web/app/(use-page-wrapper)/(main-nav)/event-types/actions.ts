"use server";

import { revalidatePath } from "next/cache";

export async function revalidateEventTypesList() {
  revalidatePath("/event-types");
}
