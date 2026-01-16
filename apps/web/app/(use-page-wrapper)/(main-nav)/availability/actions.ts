"use server";

import { revalidateTag } from "next/cache";

import { AVAILABILITY_CACHE_TAG } from "./cache";

export async function revalidateAvailabilityList() {
  revalidateTag(AVAILABILITY_CACHE_TAG, "max");
}
