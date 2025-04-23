"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSchedulePage(scheduleId: number) {
  revalidatePath(`/availability/${scheduleId}`);
}
