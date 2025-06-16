"use server";

import { revalidatePath } from "next/cache";

export async function revalidateEventTypeEditPage(id: number) {
  revalidatePath(`/event-types/${id}`);
}
