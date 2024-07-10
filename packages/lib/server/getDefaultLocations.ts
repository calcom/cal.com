import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { DailyLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeLocation } from "@calcom/prisma/zod/custom/eventtype";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
  id: SessionUser["id"];
  metadata: SessionUser["metadata"];
};

export async function getDefaultLocations(user: User): Promise<EventTypeLocation[]> {
  const defaultConferencingData = userMetadataSchema.parse(user.metadata)?.defaultConferencingApp;

  if (defaultConferencingData && defaultConferencingData.appSlug !== "daily-video") {
    const credentials = await getUsersCredentials(user);

    const foundApp = getApps(credentials, true).filter(
      (app) => app.slug === defaultConferencingData.appSlug
    )[0]; // There is only one possible install here so index [0] is the one we are looking for ;
    const locationType = foundApp?.locationOption?.value ?? DailyLocationType; // Default to Daily if no location type is found
    return [{ type: locationType, link: defaultConferencingData.appLink }];
  }

  const appKeys = await getAppKeysFromSlug("daily-video");

  if (typeof appKeys.api_key === "string") {
    return [{ type: DailyLocationType }];
  }

  return [];
}
