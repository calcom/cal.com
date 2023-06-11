import { getLocationGroupedOptions } from "@calcom/app-store/utils";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TLocationOptionsInputSchema } from "./locationOptions.schema";

type LocationOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TLocationOptionsInputSchema;
};

type IntegrationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntegrationsInputSchema;
};

type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials: true;
    name: true;
    logo: true;
  };
}>;

type TeamQueryWithParent = TeamQuery & {
  parent?: TeamQuery | null;
};
export const locationOptionsHandler = async ({ ctx, input }: LocationOptionsOptions) => {
  const { user } = ctx;
  const { teamId } = input;
  let credentials = user.credentials;
  // const credentials = await prisma.credential.findMany({
  //   where: {
  //     OR: [{ userId: ctx.user.id }, input?.teamId ? { teamId: input.teamId } : {}],
  //   },
  //   select: {
  //     id: true,
  //     type: true,
  //     key: true,
  //     userId: true,
  //     team: {
  //       select: {
  //         name: true,
  //         parent: {
  //           select: {
  //             id: true,
  //             credentials: true,
  //             name: true,
  //             logo: true,
  //           },
  //         },
  //       },
  //     },
  //     appId: true,
  //     invalid: true,
  //   },
  // });

  let userAdminTeams: TeamQueryWithParent[] = [];

  if (teamId) {
    // Get app credentials that the user is an admin or owner to
    userAdminTeams = await prisma.team.findMany({
      where: {
        ...(teamId && { id: teamId }),
        members: {
          some: {
            userId: user.id,
            role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
          },
        },
      },
      select: {
        id: true,
        credentials: true,
        name: true,
        logo: true,
        parent: {
          select: {
            id: true,
            credentials: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    // If a team is a part of an org then include those apps
    // Don't want to iterate over these parent teams
    const parentTeams: TeamQueryWithParent[] = [];
    // Only loop and grab parent teams if a teamId was given. If not then all teams will be queried
    if (teamId) {
      userAdminTeams.forEach((team) => {
        if (team?.parent) {
          parentTeams.push(team.parent);
          delete team.parent;
        }
      });
    }

    userAdminTeams = [...userAdminTeams, ...parentTeams];

    const teamAppCredentials: Credential[] = userAdminTeams.flatMap((teamApp) => teamApp.credentials.flat());
    credentials = credentials.concat(teamAppCredentials);
  }

  const integrations = await getEnabledApps(credentials);

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const locationOptions = getLocationGroupedOptions(integrations, t);

  return locationOptions;
};
