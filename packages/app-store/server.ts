import type { TFunction } from "next-i18next";

import type { CredentialDataWithTeamName } from "@calcom/app-store/utils";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import { defaultLocations } from "./locations";

export async function getLocationGroupedOptions(
  userOrTeamId: { userId: number } | { teamId: number },
  t: TFunction
) {
  const apps: Record<
    string,
    {
      label: string;
      value: string;
      disabled?: boolean;
      icon?: string;
      slug?: string;
      credential?: CredentialDataWithTeamName;
    }[]
  > = {};

  let idToSearchObject = {};

  if ("teamId" in userOrTeamId) {
    const teamId = userOrTeamId.teamId;
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
    idToSearchObject = { userId: userOrTeamId.userId };
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

  integrations.forEach((app) => {
    if (app.locationOption) {
      // All apps that are labeled as a locationOption are video apps. Extract the secondary category if available
      let category =
        app.categories.length >= 2
          ? app.categories.find(
              (category) =>
                !([AppCategories.video, AppCategories.conferencing] as string[]).includes(category)
            )
          : app.category;
      if (!category) category = AppCategories.conferencing;

      for (const credential of app.credentials) {
        const label = `${app.locationOption.label} ${
          credential.team?.name ? `(${credential.team.name})` : ""
        }`;
        const option = { ...app.locationOption, label, icon: app.logo, slug: app.slug, credential };
        if (apps[category]) {
          apps[category] = [...apps[category], option];
        } else {
          apps[category] = [option];
        }
      }
    }
  });

  defaultLocations.forEach((l) => {
    const category = l.category;
    if (apps[category]) {
      apps[category] = [
        ...apps[category],
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    } else {
      apps[category] = [
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    }
  });
  const locations = [];

  // Translating labels and pushing into array
  for (const category in apps) {
    const tmp = {
      label: t(category),
      options: apps[category].map((l) => ({
        ...l,
        label: t(l.label),
      })),
    };

    locations.push(tmp);
  }

  return locations;
}
