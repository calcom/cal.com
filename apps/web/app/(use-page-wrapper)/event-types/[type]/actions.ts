"use server";

import { updateTag } from "next/cache";

export async function revalidateEventTypeEditPage(id: number, childEventTypeIds?: number[]) {
  updateTag(`viewer.eventTypes.get.${id}`);
  if (childEventTypeIds) {
    for (const childId of childEventTypeIds) {
      updateTag(`viewer.eventTypes.get.${childId}`);
    }
  }
}
