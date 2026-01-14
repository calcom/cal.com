import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { PrismaClient } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TMassApplyHostLocationInputSchema } from "./massApplyHostLocation.schema";

type MassApplyHostLocationInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TMassApplyHostLocationInputSchema;
};

type MassApplyHostLocationResponse = {
  success: boolean;
  updatedCount: number;
};

const findCredentialIdForLocationType = (
  locationType: string,
  credentials: { id: number; type: string; appId: string | null }[]
): number | null => {
  const appMeta = Object.values(appStoreMetadata).find(
    (app) => app.appData?.location?.type === locationType
  );
  if (!appMeta) return null;

  const matchingCredential = credentials.find(
    (cred) => cred.type === appMeta.type || cred.appId === appMeta.slug
  );
  return matchingCredential?.id ?? null;
};

export const massApplyHostLocationHandler = async ({
  ctx,
  input,
}: MassApplyHostLocationInput): Promise<MassApplyHostLocationResponse> => {
  const { eventTypeId, locationType, link, address, phoneNumber } = input;

  const eventType = await ctx.prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: { id: true, teamId: true },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  const hosts = await ctx.prisma.host.findMany({
    where: { eventTypeId },
    select: {
      userId: true,
      user: {
        select: {
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
              type: true,
              appId: true,
            },
          },
        },
      },
    },
  });

  if (hosts.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  await ctx.prisma.$transaction(
    hosts.map((host) => {
      const credentialId = findCredentialIdForLocationType(locationType, host.user.credentials);

      return ctx.prisma.hostLocation.upsert({
        where: {
          userId_eventTypeId: { userId: host.userId, eventTypeId },
        },
        create: {
          eventTypeId,
          userId: host.userId,
          type: locationType,
          link: link || null,
          address: address || null,
          phoneNumber: phoneNumber || null,
          credentialId,
        },
        update: {
          type: locationType,
          link: link || null,
          address: address || null,
          phoneNumber: phoneNumber || null,
          credentialId,
        },
      });
    })
  );

  return { success: true, updatedCount: hosts.length };
};
