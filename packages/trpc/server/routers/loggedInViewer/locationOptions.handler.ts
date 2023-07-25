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
  const { teamId } = input;

  let idToSearchObject = {};

  if (teamId) {
    // See if the team event belongs to an org
    const org = await prisma.team.findFirst({
      where: {
        children: {
          some: {
            id: teamId,
          },
        },
      },
    });

    if (org) {
      idToSearchObject = {
        teamId: {
          in: [teamId, org.id],
        },
      };
    } else {
      idToSearchObject = { teamId };
    }
  } else {
    idToSearchObject = { userId: ctx.user.id };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      ...idToSearchObject,
      app: {
        categories: {
          hasSome: [AppCategories.conferencing, AppCategories.video],
        },
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      teamId: true,
      appId: true,
      invalid: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  const integrations = await getEnabledApps(credentials, true);

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const locationOptions = getLocationGroupedOptions(integrations, t, true);
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
