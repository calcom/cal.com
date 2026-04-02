import { getAppFromSlug } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";

type GetUserConnectedAppsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetUserConnectedAppsInputSchema;
};

const credentialSelect = {
  userId: true,
  app: {
    select: {
      slug: true,
      categories: true,
    },
  },
  destinationCalendars: {
    select: {
      externalId: true,
    },
  },
} satisfies Prisma.CredentialSelect;

// Explicit type to avoid Prisma.CredentialGetPayload conditional types leaking into .d.ts files
type Credential = {
  userId: number | null;
  app: { slug: string; categories: AppCategories[] } | null;
  destinationCalendars: { externalId: string }[];
};

type Apps = {
  name: string | null;
  logo: string | null;
  externalId: string | null;
  app: { slug: string; categories: AppCategories[] } | null;
};

// This should improve performance saving already app data found.
const appDataMap = new Map();

const checkCanUserAccessConnectedApps = async (
  user: NonNullable<TrpcSessionUser>,
  teamId: number,
  userIds: number[]
) => {
  // Check if the user is a member of the team or an admin/owner of the org
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      parent: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const isMember = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId: teamId,
      },
    },
  });

  const isOrgAdminOrOwner =
    team.parent &&
    (await prisma.membership.findFirst({
      where: {
        userId: user.id,
        teamId: team.parent.id,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    }));

  if (!isMember && !isOrgAdminOrOwner) {
    throw new Error("User is not authorized to access this team's connected apps");
  }

  // Check if all userIds belong to the team
  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId,
      userId: {
        in: userIds,
      },
    },
    select: {
      userId: true,
    },
  });

  if (teamMembers.length !== userIds.length) {
    const teamMemberIds = teamMembers.map((member) => member.userId);
    const invalidUserIds = userIds.filter((id) => !teamMemberIds.includes(id));

    if (invalidUserIds.length > 0) {
      throw new Error(`Some user IDs do not belong to the team: ${invalidUserIds.join(", ")}`);
    }
  }
};

export const getUserConnectedAppsHandler = async ({ ctx, input }: GetUserConnectedAppsOptions) => {
  const { userIds, teamId } = input;

  await checkCanUserAccessConnectedApps(ctx.user, teamId, userIds);

  const credentialsPromises: Promise<Credential[]>[] = [];
  const userConnectedAppsMap: Record<number, Apps[]> = {};

  for (const userId of userIds) {
    const cred = prisma.credential.findMany({
      where: {
        userId,
      },
      select: credentialSelect,
    });
    credentialsPromises.push(cred);
  }

  const credentialsList = await Promise.all(credentialsPromises);

  for (const credentials of credentialsList) {
    const userId = credentials[0]?.userId;

    if (userId) {
      userConnectedAppsMap[userId] = credentials?.map((cred) => {
        const appSlug = cred.app?.slug;
        let appData = appDataMap.get(appSlug);

        if (!appData) {
          appData = getAppFromSlug(appSlug);
          appDataMap.set(appSlug, appData);
        }

        const isCalendar = cred?.app?.categories?.includes("calendar") ?? false;
        const externalId = isCalendar ? cred.destinationCalendars?.[0]?.externalId : null;
        return {
          name: appData?.name ?? null,
          logo: appData?.logo ?? null,
          app: cred.app,
          externalId: externalId ?? null,
        };
      });
    }
  }

  return userConnectedAppsMap;
};

export default getUserConnectedAppsHandler;
