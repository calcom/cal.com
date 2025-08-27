"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateEventTypeEditPage(id: number) {
  revalidatePath(`/event-types/${id}`);
}

export async function revalidateOgImageMeetingTag(eventTypeId: number) {
  revalidateTag(`og-image:meeting:${eventTypeId}`);
}
