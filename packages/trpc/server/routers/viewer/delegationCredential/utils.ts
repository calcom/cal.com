import { z } from "zod";

import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["delegationCredential/utils"] });
export class InvalidServiceAccountKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidServiceAccountKeyError";
  }
}

export async function ensureDelegationCredentialNotAlreadyConfigured({
  domain,
  currentOrganizationId,
  delegationCredentialBeingUpdatedId,
}: {
  domain: string;
  currentOrganizationId: number;
  delegationCredentialBeingUpdatedId: string | null;
}) {
  const allDelegationsForDomain = await DelegationCredentialRepository.findAllByDomain({
    domain,
  });

  const conflictingDelegationInCurrentOrg = allDelegationsForDomain.find(
    (delegation) =>
      delegation.organizationId === currentOrganizationId &&
      delegation.id !== delegationCredentialBeingUpdatedId
  );

  if (conflictingDelegationInCurrentOrg) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Your organization already has delegation credential for ${conflictingDelegationInCurrentOrg.domain}`,
    });
  }

  const differentOrgEnabledDelegations = allDelegationsForDomain.filter(
    (delegation) => delegation.organizationId !== currentOrganizationId && delegation.enabled
  );

  if (differentOrgEnabledDelegations.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Domain ${domain} already has delegation credential enabled in another organization`,
    });
  }
}

export function parseServiceAccountKey(serviceAccountKey: Prisma.JsonValue) {
  if (!serviceAccountKey) {
    return null;
  }
  const schema = z.object({
    client_id: z.string(),
    private_key: z.string(),
    client_email: z.string(),
  });

  const parsedServiceAccountKey = schema.safeParse(serviceAccountKey);

  if (!parsedServiceAccountKey.success) {
    console.error("Invalid service account key", parsedServiceAccountKey.error);
    throw new InvalidServiceAccountKeyError(
      "Service account key must contain private_key, client_email and client_id"
    );
  }

  return parsedServiceAccountKey.data;
}

export const handleDelegationCredentialError = (error: unknown) => {
  if (error instanceof InvalidServiceAccountKeyError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof TRPCError) {
    throw error;
  }

  log.error("Error handling delegation credential:", safeStringify(error));
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An error occurred while handling delegation credential settings.",
  });
};

export const ensureNoServiceAccountKey = <T extends { id: string; serviceAccountKey?: unknown } | null>(
  delegationCredential: T
) => {
  if (!delegationCredential) {
    return null;
  }
  const { serviceAccountKey: _1, ...rest } = delegationCredential;
  return {
    ...rest,
    serviceAccountKey: undefined,
  };
};
