import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import { AppCategories } from "@calcom/prisma/enums";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetHostsWithLocationOptionsInputSchema } from "./getHostsWithLocationOptions.schema";

type GetHostsWithLocationOptionsInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetHostsWithLocationOptionsInputSchema;
};

export type HostWithLocationOptions = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  location: {
    id: number;
    type: string;
    credentialId: number | null;
    link: string | null;
    address: string | null;
    phoneNumber: string | null;
  } | null;
  installedApps: {
    appId: string | null;
    credentialId: number;
    type: string;
    locationOption?: {
      value: string;
      label: string;
      icon?: string;
    };
  }[];
};

export const getHostsWithLocationOptionsHandler = async ({
  ctx,
  input,
}: GetHostsWithLocationOptionsInput): Promise<HostWithLocationOptions[]> => {
  const { eventTypeId } = input;

  const eventType = await ctx.prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          parentId: true,
        },
      },
    },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  const organizationId = eventType.team?.parentId ?? null;

  const hosts = await ctx.prisma.host.findMany({
    where: {
      eventTypeId,
      isFixed: false,
    },
    select: {
      userId: true,
      isFixed: true,
      priority: true,
      location: {
        select: {
          id: true,
          type: true,
          credentialId: true,
          link: true,
          address: true,
          phoneNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          credentials: {
            where: {
              app: {
                categories: {
                  hasSome: [AppCategories.conferencing, AppCategories.video],
                },
              },
            },
            select: {
              id: true,
              appId: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }, { priority: "desc" }],
  });

  const usersForEnrichment = hosts.map((host) => ({
    id: host.user.id,
    email: host.user.email,
    credentials: host.user.credentials,
  }));

  const enrichedUsers = await enrichUsersWithDelegationCredentials({
    orgId: organizationId,
    users: usersForEnrichment,
  });

  return hosts.map((host, index) => ({
    userId: host.userId,
    name: host.user.name,
    email: host.user.email,
    avatarUrl: host.user.avatarUrl,
    location: host.location,
    installedApps: enrichedUsers[index].credentials.map((cred) => {
      const appMeta = cred.appId
        ? Object.values(appStoreMetadata).find((app) => app.slug === cred.appId)
        : null;
      const locationData = appMeta?.appData?.location;

      return {
        appId: cred.appId,
        credentialId: cred.id,
        type: cred.type,
        locationOption: locationData
          ? {
              value: locationData.type,
              label: locationData.label || appMeta?.name || cred.appId || "",
              icon: appMeta?.logo,
            }
          : undefined,
      };
    }),
  }));
};
