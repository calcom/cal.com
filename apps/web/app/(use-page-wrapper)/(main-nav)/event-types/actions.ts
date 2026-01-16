"use server";

import { revalidateTag } from "next/cache";

import { EVENT_TYPES_CACHE_TAG } from "./cache";

export async function revalidateEventTypesList() {
  revalidateTag(EVENT_TYPES_CACHE_TAG, "max");
}
