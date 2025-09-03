import type { AppCategories } from "@prisma/client";

export const MeetLocationType = "integrations:google:meet";

export const MSTeamsLocationType = "integrations:office365_video";

export const defaultVideoAppCategories: AppCategories[] = ["messaging", "conferencing", "video"];
