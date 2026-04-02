import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { HostLocationRepository } from "@calcom/features/host/repositories/HostLocationRepository";
import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import type { PrismaClient } from "@calcom/prisma";
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
  const appMeta = Object.values(appStoreMetadata).find((app) => app.appData?.location?.type === locationType);
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

  const eventTypeRepo = new EventTypeRepository(ctx.prisma);
  const eventType = await eventTypeRepo.findByIdWithTeamId({ id: eventTypeId });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  const hostRepo = new HostRepository(ctx.prisma);
  const hosts = await hostRepo.findHostsWithConferencingCredentials(eventTypeId);

  if (hosts.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const hostLocationRepo = new HostLocationRepository(ctx.prisma);
  const locations = hosts.map((host) => ({
    userId: host.userId,
    eventTypeId,
    type: locationType,
    link: link || null,
    address: address || null,
    phoneNumber: phoneNumber || null,
    credentialId: findCredentialIdForLocationType(locationType, host.user.credentials),
  }));

  await hostLocationRepo.upsertMany(locations);

  return { success: true, updatedCount: hosts.length };
};
