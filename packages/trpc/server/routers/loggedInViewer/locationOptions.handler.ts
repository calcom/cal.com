import { getLocationGroupedOptions } from "@calcom/app-store/utils";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type LocationOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const locationOptionsHandler = async ({ ctx }: LocationOptionsOptions) => {
  const credentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
      invalid: true,
    },
  });

  const integrations = await getEnabledApps(credentials);

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const locationOptions = getLocationGroupedOptions(integrations, t);

  return locationOptions;
};
