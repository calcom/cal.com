import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import getApps from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import z from "zod";
import type { TUpdateUserDefaultConferencingAppInputSchema } from "./updateUserDefaultConferencingApp.schema";

type UpdateUserDefaultConferencingAppOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateUserDefaultConferencingAppInputSchema;
};

export const updateUserDefaultConferencingAppHandler = async ({
  ctx,
  input,
}: UpdateUserDefaultConferencingAppOptions) => {
  const currentMetadata = userMetadata.parse(ctx.user.metadata);
  // getApps need credentials with service account key
  // We aren't returning the credential, so we are fine with the service account key
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(ctx.user);
  const foundApp = getApps(credentials, true).filter((app) => app.slug === input.appSlug)[0];
  const appLocation = foundApp?.appData?.location;

  if (!foundApp || !appLocation) throw new TRPCError({ code: "BAD_REQUEST", message: "App not installed" });

  if (appLocation.linkType === "static" && !input.appLink) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "App link is required" });
  }

  if (appLocation.linkType === "static" && appLocation.urlRegExp) {
    const validLink = z
      .string()
      .regex(new RegExp(appLocation.urlRegExp), "Invalid App Link")
      .parse(input.appLink);
    if (!validLink) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid app link" });
    }
  }

  await prisma.user.update({
    where: {
      id: ctx.user.id,
    },
    data: {
      metadata: {
        ...currentMetadata,
        defaultConferencingApp: {
          appSlug: input.appSlug,
          appLink: input.appLink,
        },
      },
    },
  });
  return input;
};
