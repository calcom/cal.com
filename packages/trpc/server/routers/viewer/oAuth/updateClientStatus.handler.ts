import { TRPCError } from "@trpc/server";

import { sendOAuthClientApprovedNotification, sendOAuthClientRejectedNotification } from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

import type { TUpdateClientInputSchema } from "./updateClientStatus.schema";

type UpdateClientStatusOptions = {
  ctx: {
    user: {
      id: number;
      role: UserPermissionRole;
    };
    prisma: PrismaClient;
  };
  input: TUpdateClientInputSchema;
};

type UpdateClientStatusOutput = {
  clientId: string;
  name: string;
  purpose: string;
  approvalStatus: OAuthClientApprovalStatus;
  redirectUri: string;
  websiteUrl: string | null;
  logo: string | null;
  rejectionReason: string | null;
};

export const updateClientStatusHandler = async ({
  ctx,
  input,
}: UpdateClientStatusOptions): Promise<UpdateClientStatusOutput> => {
  const { clientId, status, rejectionReason, name, purpose, redirectUri, websiteUrl, logo } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const existingClient = await oAuthClientRepository.findByClientId(clientId);
  if (!existingClient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }

  const isAdmin = ctx.user.role === UserPermissionRole.ADMIN;
  const isOwner = existingClient.userId != null && existingClient.userId === ctx.user.id;

  if (rejectionReason !== undefined && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can set a rejection reason" });
  }

  if (status === "REJECTED" && (!rejectionReason || rejectionReason.trim().length === 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Rejection reason is required" });
  }

  const isUpdatingFields =
    name !== undefined || purpose !== undefined || redirectUri !== undefined || websiteUrl !== undefined || logo !== undefined;
  const isUpdatingStatus = status !== undefined;

  if (isUpdatingStatus && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update OAuth client status" });
  }

  if (isUpdatingFields && !isAdmin && !isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update this OAuth client" });
  }

  const triggersReapprovalForOwnerEdit =
    isOwner &&
    ((name !== undefined && name !== existingClient.name) ||
      (logo !== undefined && (logo ?? null) !== (existingClient.logo ?? null)) ||
      (websiteUrl !== undefined && (websiteUrl ?? null) !== (existingClient.websiteUrl ?? null)));

  const nextApprovalStatus: OAuthClientApprovalStatus =
    status ?? (triggersReapprovalForOwnerEdit ? "PENDING" : existingClient.approvalStatus);

  // Get client with user info before updating if we might need to send an email
  const clientWithUser =
    isAdmin && (status === "APPROVED" || status === "REJECTED")
      ? await oAuthClientRepository.findByClientIdIncludeUser(clientId)
      : null;

  const updateData: {
    name?: string;
    purpose?: string;
    redirectUri?: string;
    logo?: string | null;
    websiteUrl?: string | null;
    approvalStatus?: OAuthClientApprovalStatus;
    rejectionReason?: string | null;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (purpose !== undefined) updateData.purpose = purpose;
  if (redirectUri !== undefined) updateData.redirectUri = redirectUri;
  if (logo !== undefined) updateData.logo = logo;
  if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
  if (nextApprovalStatus !== existingClient.approvalStatus) updateData.approvalStatus = nextApprovalStatus;

  if (status === "REJECTED") {
    updateData.rejectionReason = rejectionReason?.trim() ?? null;
  } else if (status !== undefined) {
    updateData.rejectionReason = null;
  } else if (nextApprovalStatus !== existingClient.approvalStatus && nextApprovalStatus !== "REJECTED") {
    updateData.rejectionReason = null;
  }

  const updatedClient = await ctx.prisma.oAuthClient.update({
    where: { clientId },
    data: updateData,
    select: {
      clientId: true,
      name: true,
      purpose: true,
      approvalStatus: true,
      redirectUri: true,
      websiteUrl: true,
      logo: true,
      rejectionReason: true,
    },
  });

  // Send approval notification email to user if approved
  if (status === "APPROVED" && clientWithUser?.user) {
    const t = await getTranslation("en", "common");

    await sendOAuthClientApprovedNotification({
      t,
      userEmail: clientWithUser.user.email,
      userName: clientWithUser.user.name,
      clientName: updatedClient.name,
      clientId: updatedClient.clientId,
    });
  }

  if (status === "REJECTED" && clientWithUser?.user) {
    const t = await getTranslation("en", "common");

    await sendOAuthClientRejectedNotification({
      t,
      userEmail: clientWithUser.user.email,
      userName: clientWithUser.user.name,
      clientName: updatedClient.name,
      clientId: updatedClient.clientId,
      rejectionReason: rejectionReason?.trim() ?? "",
    });
  }

  return {
    clientId: updatedClient.clientId,
    name: updatedClient.name,
    purpose: updatedClient.purpose,
    approvalStatus: updatedClient.approvalStatus,
    redirectUri: updatedClient.redirectUri,
    websiteUrl: updatedClient.websiteUrl,
    logo: updatedClient.logo,
    rejectionReason: updatedClient.rejectionReason,
  };
};
