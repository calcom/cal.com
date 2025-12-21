import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import getApps, { sanitizeAppForViewer } from "@calcom/app-store/utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TAppByIdInputSchema } from "./appById.schema";

type AppByIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAppByIdInputSchema;
};

export const appByIdHandler = async ({ ctx, input }: AppByIdOptions) => {
  const { user } = ctx;
  const appId = input.appId;
  // getApps need credentials with service account key, but we are filtering credentials out already before returning from this fn
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  const apps = getApps(credentials);
  const appFromDb = apps.find((app) => app.slug === appId);
  if (!appFromDb) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find app ${appId}` });
  }

  const safeApp = sanitizeAppForViewer(appFromDb);
  return {
    isInstalled: appFromDb.credentials.length,
    ...safeApp,
  };
};
