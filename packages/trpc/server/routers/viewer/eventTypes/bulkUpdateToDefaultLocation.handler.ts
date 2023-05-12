import type { LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TBulkUpdateToDefaultLocationInputSchema } from "./bulkUpdateToDefaultLocation.schema";

type BulkUpdateToDefaultLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUpdateToDefaultLocationInputSchema;
};

export const bulkUpdateToDefaultLocationHandler = async ({
  ctx,
  input,
}: BulkUpdateToDefaultLocationOptions) => {
  const { eventTypeIds } = input;
  const defaultApp = userMetadataSchema.parse(ctx.user.metadata)?.defaultConferencingApp;

  if (!defaultApp) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default conferencing app not set",
    });
  }

  const foundApp = getAppFromSlug(defaultApp.appSlug);
  const appType = foundApp?.appData?.location?.type;
  if (!appType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Default conferencing app '${defaultApp.appSlug}' doesnt exist.`,
    });
  }

  return await prisma.eventType.updateMany({
    where: {
      id: {
        in: eventTypeIds,
      },
      userId: ctx.user.id,
    },
    data: {
      locations: [{ type: appType, link: defaultApp.appLink }] as LocationObject[],
    },
  });
};
