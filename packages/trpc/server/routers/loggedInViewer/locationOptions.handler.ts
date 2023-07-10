import { getLocationGroupedOptions } from "@calcom/app-store/utils";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TLocationOptionsInputSchema } from "./locationOptions.schema";

type LocationOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TLocationOptionsInputSchema;
};

export const locationOptionsHandler = async ({ ctx, input }: LocationOptionsOptions) => {
  const credentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      app: {
        categories: {
          has: AppCategories.video,
        },
      },
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
  // If it is a team event then move the "use host location" option to top
  if (input.teamId) {
    const conferencingIndex = locationOptions.findIndex((option) => option.label === "Conferencing");
    if (conferencingIndex !== -1) {
      const conferencingObject = locationOptions.splice(conferencingIndex, 1)[0];
      locationOptions.unshift(conferencingObject);
    }
  }

  return locationOptions;
};
