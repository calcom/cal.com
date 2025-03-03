import type { EventType, Team } from "@calcom/prisma/client";

export type IEventTypeFilter = Pick<EventType, "id" | "slug" | "title"> & {
  team: Pick<Team, "id" | "name"> | null;
};
