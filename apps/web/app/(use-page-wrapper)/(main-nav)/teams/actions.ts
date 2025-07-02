"use server";

import { revalidateTag } from "next/cache";

export async function revalidateTeamsList() {
  revalidateTag("viewer.teams.list");
}
