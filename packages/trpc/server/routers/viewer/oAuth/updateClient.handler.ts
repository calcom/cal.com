import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";
import { OAuthClientStatus } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TUpdateClientInputSchema } from "./updateClient.schema";

type UpdateClientOptions = {
  ctx: {
    user: { id: number; role: string };
    prisma: PrismaClient;
  };
  input: TUpdateClientInputSchema;
};

export const updateClientHandler = async ({ ctx, input }: UpdateClientOptions) => {
  const { clientId, status, rejectionReason, ...updateFields } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const existingClient = await oAuthClientRepository.findByClientId(clientId);
  if (!existingClient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  const isOwner = existingClient.userId != null && existingClient.userId === ctx.user.id;
  const isAdmin = ctx.user.role === "ADMIN";

  // Status changes (approve/reject) require admin
  if (status !== undefined && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change client status" });
  }

  // Non-status field updates require ownership (or admin)
  if (!isOwner && !isAdmin) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  // If admin is changing status, update status directly
  if (status !== undefined && isAdmin) {
    await oAuthClientRepository.updateStatus(clientId, status);

    if (status === OAuthClientStatus.REJECTED && rejectionReason) {
      await ctx.prisma.oAuthClient.update({
        where: { clientId },
        data: { rejectionReason },
      });
    }
  }

  // Build update data from non-undefined fields
  const updateData: {
    name?: string;
    purpose?: string;
    redirectUri?: string;
    logo?: string;
    websiteUrl?: string;
  } = {};

  if (updateFields.name !== undefined) updateData.name = updateFields.name;
  if (updateFields.purpose !== undefined) updateData.purpose = updateFields.purpose;
  if (updateFields.redirectUri !== undefined) updateData.redirectUri = updateFields.redirectUri;
  if (updateFields.logo !== undefined) updateData.logo = updateFields.logo ?? undefined;
  if (updateFields.websiteUrl !== undefined) updateData.websiteUrl = updateFields.websiteUrl ?? undefined;

  if (Object.keys(updateData).length > 0) {
    await oAuthClientRepository.update(clientId, updateData);
  }

  // If redirectUri changed on an APPROVED client, reset to PENDING for re-approval
  if (
    updateFields.redirectUri !== undefined &&
    existingClient.status === OAuthClientStatus.APPROVED &&
    updateFields.redirectUri !== existingClient.redirectUri
  ) {
    await oAuthClientRepository.updateStatus(clientId, OAuthClientStatus.PENDING);
  }

  const updated = await oAuthClientRepository.findByClientId(clientId);

  return {
    clientId,
    name: updated?.name ?? existingClient.name,
    purpose: updated?.purpose ?? existingClient.purpose,
    redirectUri: updated?.redirectUri ?? existingClient.redirectUri,
    websiteUrl: updated?.websiteUrl ?? existingClient.websiteUrl,
    logo: updated?.logo ?? existingClient.logo,
    status: updated?.status ?? existingClient.status,
    rejectionReason: updated?.rejectionReason ?? existingClient.rejectionReason,
  };
};
