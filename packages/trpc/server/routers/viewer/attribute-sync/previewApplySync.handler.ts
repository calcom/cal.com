import { getAttributeSyncApplyService } from "@calcom/features/ee/integration-attribute-sync/di/AttributeSyncApplyService.container";
import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZPreviewApplySyncSchema } from "./previewApplySync.schema";
import { fetchSalesforceUserFields } from "./fetchSalesforceUserFields";

type PreviewApplySyncOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZPreviewApplySyncSchema;
};

const previewApplySyncHandler = async ({ ctx, input }: PreviewApplySyncOptions) => {
  const org = ctx.user.organization;

  if (!org?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  const integrationService = getIntegrationAttributeSyncService();
  const sync = await integrationService.getById(input.syncId);

  if (!sync || sync.organizationId !== org.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sync configuration not found" });
  }

  if (!sync.credentialId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Sync has no associated credential" });
  }

  const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: sync.credentialId });
  if (!credential?.key) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Credential not found or invalid" });
  }

  const key = credential.key as Record<string, unknown>;
  const accessToken = key.access_token;
  const instanceUrl = key.instance_url;

  if (typeof accessToken !== "string" || typeof instanceUrl !== "string") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Salesforce credential format" });
  }

  const fieldNames = sync.syncFieldMappings.filter((m) => m.enabled).map((m) => m.integrationFieldName);

  if (fieldNames.length === 0) {
    return [];
  }

  const profiles = await ProfileRepository.findManyForOrg({ organizationId: org.id });
  const orgMembers = profiles.map((p) => ({
    userId: p.user.id,
    userName: p.user.name,
    userEmail: p.user.email,
  }));

  const integrationFieldsByEmail = await fetchSalesforceUserFields({
    accessToken,
    instanceUrl,
    fieldNames,
  });

  const applyService = getAttributeSyncApplyService();
  return applyService.getPreview({
    syncId: input.syncId,
    organizationId: org.id,
    orgMembers,
    integrationFieldsByEmail,
  });
};

export default previewApplySyncHandler;
