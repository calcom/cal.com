import { TRPCError } from "@trpc/server";

import {
  sendOAuthClientApprovedNotification,
  sendOAuthClientRejectedNotification,
} from "@calcom/emails/oauth-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { PrismaClient } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { OAuthClientStatus } from "@calcom/prisma/enums";

import type { TUpdateClientInputSchema } from "./updateClient.schema";

type UpdateClientOptions = {
  ctx: {
    user: {
      id: number;
      role: UserPermissionRole;
    };
    prisma: PrismaClient;
  };
  input: TUpdateClientInputSchema;
};

type UpdateClientOutput = {
  clientId: string;
  name: string;
  purpose: string | null;
  status: OAuthClientStatus;
  redirectUri: string;
  websiteUrl: string | null;
  logo: string | null;
  rejectionReason: string | null;
};

const updateClientHandler = async ({ ctx, input }: UpdateClientOptions): Promise<UpdateClientOutput> => {
  const {
    clientId,
    status: requestedStatus,
    rejectionReason,
    name,
    purpose,
    redirectUri,
    websiteUrl,
    logo,
  } = input;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  const isAdmin = ctx.user.role === UserPermissionRole.ADMIN;

  const clientWithUser = await oAuthClientRepository.findByClientIdIncludeUser(clientId);
  if (!clientWithUser) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth Client not found" });
  }
  const isOwner = clientWithUser.userId != null && clientWithUser.userId === ctx.user.id;

  if (rejectionReason !== undefined && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can set a rejection reason" });
  }

  if (requestedStatus === "REJECTED" && (!rejectionReason || rejectionReason.trim().length === 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Rejection reason is required" });
  }

  const isUpdatingFields = hasAnyFieldsChanged({ name, purpose, redirectUri, websiteUrl, logo });
  const isUpdatingStatus = requestedStatus !== undefined;

  if (isUpdatingStatus && !isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update OAuth client status" });
  }

  if (isUpdatingFields && !isAdmin && !isOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to update this OAuth client",
    });
  }

  const shouldTriggerReapprovalForOwnerEdit = triggersReapprovalForOwnerEdit({
    isAdmin,
    isOwner,
    currentClient: {
      name: clientWithUser.name,
      logo: clientWithUser.logo,
      websiteUrl: clientWithUser.websiteUrl,
      redirectUri: clientWithUser.redirectUri,
    },
    proposedUpdates: {
      name,
      logo,
      websiteUrl,
      redirectUri,
    },
  });

  const nextStatus = computeNextStatus({
    requestedStatus,
    triggersReapprovalForOwnerEdit: shouldTriggerReapprovalForOwnerEdit,
    currentStatus: clientWithUser.status,
  });

  const updateData = buildUpdateClientUpdateData({
    name,
    purpose,
    redirectUri,
    logo,
    websiteUrl,
    requestedStatus,
    rejectionReason,
    nextStatus,
    currentStatus: clientWithUser.status,
  });

  const updatedClient = await ctx.prisma.oAuthClient.update({
    where: { clientId },
    data: updateData,
    select: {
      clientId: true,
      name: true,
      purpose: true,
      status: true,
      redirectUri: true,
      websiteUrl: true,
      logo: true,
      rejectionReason: true,
    },
  });

  await notifyOwnerAboutAdminReview({
    isAdmin,
    requestedStatus,
    clientWithUser,
    updatedClient: {
      clientId: updatedClient.clientId,
      name: updatedClient.name,
    },
    rejectionReason,
  });

  return {
    clientId: updatedClient.clientId,
    name: updatedClient.name,
    purpose: updatedClient.purpose,
    status: updatedClient.status,
    redirectUri: updatedClient.redirectUri,
    websiteUrl: updatedClient.websiteUrl,
    logo: updatedClient.logo,
    rejectionReason: updatedClient.rejectionReason,
  };
};

function toNullableString(value: string | null | undefined) {
  return value ?? null;
}

function hasAnyFieldsChanged(fields: Record<string, unknown>) {
  return Object.values(fields).some((value) => value !== undefined);
}

type ClientFieldsForReapprovalCheck = {
  name: string;
  logo: string | null;
  websiteUrl: string | null;
  redirectUri: string;
};

function triggersReapprovalForOwnerEdit(params: {
  isAdmin: boolean;
  isOwner: boolean;
  currentClient: ClientFieldsForReapprovalCheck;
  proposedUpdates: Partial<{
    name: string;
    logo: string | null;
    websiteUrl: string | null;
    redirectUri: string;
  }>;
}) {
  const { isAdmin, isOwner, currentClient, proposedUpdates } = params;
  if (isAdmin) return false;
  if (!isOwner) return false;

  if (proposedUpdates.name !== undefined && proposedUpdates.name !== currentClient.name) {
    return true;
  }

  if (
    proposedUpdates.logo !== undefined &&
    toNullableString(proposedUpdates.logo) !== toNullableString(currentClient.logo)
  ) {
    return true;
  }

  if (
    proposedUpdates.websiteUrl !== undefined &&
    toNullableString(proposedUpdates.websiteUrl) !== toNullableString(currentClient.websiteUrl)
  ) {
    return true;
  }

  if (
    proposedUpdates.redirectUri !== undefined &&
    proposedUpdates.redirectUri !== currentClient.redirectUri
  ) {
    return true;
  }

  return false;
}

function computeNextStatus(params: {
  requestedStatus: OAuthClientStatus | undefined;
  triggersReapprovalForOwnerEdit: boolean;
  currentStatus: OAuthClientStatus;
}): OAuthClientStatus {
  const { requestedStatus, triggersReapprovalForOwnerEdit, currentStatus } = params;
  if (requestedStatus !== undefined) return requestedStatus;
  if (triggersReapprovalForOwnerEdit) return "PENDING";
  return currentStatus;
}

type NotifyOwnerAboutAdminReviewParams = {
  isAdmin: boolean;
  requestedStatus: OAuthClientStatus | undefined;
  clientWithUser: Awaited<ReturnType<OAuthClientRepository["findByClientIdIncludeUser"]>> | null;
  updatedClient: {
    clientId: string;
    name: string;
  };
  rejectionReason: string | undefined;
};

async function notifyOwnerAboutAdminReview(params: NotifyOwnerAboutAdminReviewParams) {
  const { isAdmin, requestedStatus, clientWithUser, updatedClient, rejectionReason } = params;
  if (!isAdmin) return;
  if (requestedStatus !== "APPROVED" && requestedStatus !== "REJECTED") return;
  if (!clientWithUser?.user) return;

  const t = await getTranslation("en", "common");

  if (requestedStatus === "APPROVED") {
    await sendOAuthClientApprovedNotification({
      t,
      userEmail: clientWithUser.user.email,
      userName: clientWithUser.user.name,
      clientName: updatedClient.name,
      clientId: updatedClient.clientId,
    });
    return;
  }

  await sendOAuthClientRejectedNotification({
    t,
    userEmail: clientWithUser.user.email,
    userName: clientWithUser.user.name,
    clientName: updatedClient.name,
    clientId: updatedClient.clientId,
    rejectionReason: rejectionReason?.trim() ?? "",
  });
}

type UpdateOAuthClientData = {
  name?: string;
  purpose?: string;
  redirectUri?: string;
  logo?: string | null;
  websiteUrl?: string | null;
  status?: OAuthClientStatus;
  rejectionReason?: string | null;
};

function buildUpdateClientUpdateData(params: {
  name: string | undefined;
  purpose: string | undefined;
  redirectUri: string | undefined;
  logo: string | null | undefined;
  websiteUrl: string | null | undefined;
  requestedStatus: OAuthClientStatus | undefined;
  rejectionReason: string | undefined;
  nextStatus: OAuthClientStatus;
  currentStatus: OAuthClientStatus;
}): UpdateOAuthClientData {
  const {
    name,
    purpose,
    redirectUri,
    logo,
    websiteUrl,
    requestedStatus,
    rejectionReason,
    nextStatus,
    currentStatus,
  } = params;

  const updateData: UpdateOAuthClientData = {};

  if (name !== undefined) updateData.name = name;
  if (purpose !== undefined) updateData.purpose = purpose;
  if (redirectUri !== undefined) updateData.redirectUri = redirectUri;
  if (logo !== undefined) updateData.logo = logo;
  if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
  if (nextStatus !== currentStatus) updateData.status = nextStatus;

  if (requestedStatus === "REJECTED") {
    updateData.rejectionReason = rejectionReason?.trim() ?? null;
  } else if (requestedStatus !== undefined) {
    updateData.rejectionReason = null;
  } else if (nextStatus !== currentStatus && nextStatus !== "REJECTED") {
    updateData.rejectionReason = null;
  }

  return updateData;
}

export { updateClientHandler };
