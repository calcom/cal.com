import { Prisma } from "@prisma/client";

import { getAppFromSlug } from "@calcom/app-store/utils";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TLazyLoadMembersInputSchema } from "./lazyLoadMembers.schema";

type LazyLoadMembersHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TLazyLoadMembersInputSchema;
};

// This should improve performance saving already app data found.
const appDataMap = new Map();
const userSelect = Prisma.validator<Prisma.UserSelect>()({
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  id: true,
  bio: true,
  disableImpersonation: true,
  teams: {
    select: {
      team: {
        select: {
          slug: true,
          id: true,
        },
      },
    },
  },
  credentials: {
    select: {
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
    },
  },
});

export const lazyLoadMembersHandler = async ({ ctx, input }: LazyLoadMembersHandlerOptions) => {
  const { prisma } = ctx;
  const { cursor, limit, teamId, searchTerm } = input;

  const getTotalMembers = await prisma.membership.count({
    where: {
      teamId,
    },
  });

  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId,
      ...(searchTerm && {
        user: {
          OR: [
            {
              email: {
                contains: searchTerm,
              },
            },
            {
              username: {
                contains: searchTerm,
              },
            },
          ],
        },
      }),
    },
    select: {
      id: true,
      role: true,
      accepted: true,
      user: {
        select: userSelect,
      },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: {
      id: "asc",
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers && teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem?.id;
  }

  const members = await Promise.all(
    teamMembers.map(async (member) => ({
      ...member,
      user: await UserRepository.enrichUserWithItsProfile({
        user: member.user,
      }),
    }))
  );

  const membersWithApps = members.map((member) => {
    const { credentials, profile, ...restUser } = member.user;
    return {
      ...restUser,
      username: profile?.username ?? restUser.username,
      role: member.role,
      profile: profile,
      organizationId: profile?.organizationId ?? null,
      organization: profile?.organization,
      accepted: member.accepted,
      disableImpersonation: member.user.disableImpersonation,
      bookerUrl: getBookerBaseUrlSync(profile?.organization?.slug || ""),
      connectedApps: credentials?.map((cred) => {
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
      }),
    };
  });

  return { members: membersWithApps, nextCursor };
};

export default lazyLoadMembersHandler;
