"use server";

import { revalidateTag } from "next/cache";

import { TEAMS_CACHE_TAG } from "./cache";

export async function revalidateTeamsList() {
  revalidateTag(TEAMS_CACHE_TAG, "max");
}
