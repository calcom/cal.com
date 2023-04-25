import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAppsInputSchema } from "./apps.schema";

type AppsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppsInputSchema;
};

export const appsHandler = async ({ ctx, input }: AppsOptions) => {
  const { user } = ctx;
  const { credentials } = user;

  const apps = await getEnabledApps(credentials);
  return apps
    .filter((app) => app.extendsFeature?.includes(input.extendsFeature))
    .map((app) => ({
      ...app,
      isInstalled: !!app.credentials?.length,
    }));
};
