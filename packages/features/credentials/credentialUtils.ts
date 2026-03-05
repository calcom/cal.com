import type {
  EventTypeAppMetadataSchema,
  eventTypeAppMetadataOptionalSchema,
} from "@calcom/app-store/zod-utils";
import { AppCategories } from "@calcom/prisma/enums";
import type z from "zod";

type App = {
  slug: string;
  categories: AppCategories[];
  dirName: string;
} | null;

export const isVideoOrConferencingApp = (app: App) =>
  app?.categories.includes(AppCategories.video) || app?.categories.includes(AppCategories.conferencing);

export const getRemovedIntegrationNameFromAppSlug = (slug: string) =>
  slug === "msteams" ? "office365_video" : slug.split("-")[0];

export const removeAppFromEventTypeMetadata = (
  appSlugToDelete: string,
  eventTypeMetadata: {
    apps: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
  }
) => {
  const appMetadata = eventTypeMetadata?.apps
    ? Object.entries(eventTypeMetadata.apps).reduce(
        (filteredApps, [appName, appData]) => {
          if (appName !== appSlugToDelete) {
            filteredApps[appName as keyof typeof eventTypeMetadata.apps] = appData;
          }
          return filteredApps;
        },
        {} as z.infer<typeof EventTypeAppMetadataSchema>
      )
    : {};

  return appMetadata;
};
