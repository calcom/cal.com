"use server";

import { updateTag } from "next/cache";

export async function revalidateTeamsList() {
  updateTag("viewer.teams.list");
}
