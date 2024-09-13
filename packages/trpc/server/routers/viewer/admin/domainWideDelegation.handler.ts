import type { PrismaClient } from "@prisma/client";
import type { WorkspacePlatform } from "@prisma/client";

import { TRPCError } from "@trpc/server";

interface DomainWideDelegationInput {
  workspacePlatform: WorkspacePlatform;
  serviceAccountKey: string;
  enabled: boolean;
  organizationId: number;
  id?: string;
}

class InvalidServiceAccountKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidServiceAccountKeyError";
  }
}

const domainWideDelegationSafeSelect = {
  id: true,
  workspacePlatform: true,
  enabled: true,
  organizationId: true,
};

function parseServiceAccountKey(serviceAccountKey?: string) {
  if (!serviceAccountKey) {
    return null;
  }

  const trimmedServiceAccountKey = serviceAccountKey.trim();

  let parsedServiceAccountKey;
  try {
    parsedServiceAccountKey = JSON.parse(trimmedServiceAccountKey);
  } catch (error) {
    console.error("Error parsing service account key:", error);
    throw new InvalidServiceAccountKeyError("Service account key is not valid JSON");
  }

  if (!parsedServiceAccountKey.private_key || !parsedServiceAccountKey.client_email) {
    throw new InvalidServiceAccountKeyError("Service account key must contain private_key and client_email");
  }

  return parsedServiceAccountKey;
}

const upsertDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: DomainWideDelegationInput;
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  const { workspacePlatform, serviceAccountKey, enabled, organizationId } = input;
  const { prisma } = ctx;
  try {
    const parsedServiceAccountKey = parseServiceAccountKey(serviceAccountKey);

    const updatedDelegation = await prisma.domainWideDelegation.upsert({
      where: { id: input.id ?? "" },
      create: {
        workspacePlatform,
        serviceAccountKey: parsedServiceAccountKey,
        enabled,
        organizationId,
      },
      update: {
        workspacePlatform,
        enabled,
        organizationId,
      },
    });

    return {
      ...updatedDelegation,
      // Don't send the actual key back to the client
      serviceAccountKey: undefined,
    };
  } catch (error) {
    if (error instanceof InvalidServiceAccountKeyError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }

    console.error("Error updating domain-wide delegation:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An error occurred while updating domain-wide delegation settings.",
    });
  }
};

export const updateDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: DomainWideDelegationInput;
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  return upsertDomainWideDelegationHandler({ input, ctx });
};

export const addDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: DomainWideDelegationInput;
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  return upsertDomainWideDelegationHandler({ input, ctx });
};

export const listDomainWideDelegationsHandler = async ({
  ctx,
}: {
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  const { prisma } = ctx;

  const domainWideDelegations = await prisma.domainWideDelegation.findMany({
    select: domainWideDelegationSafeSelect,
  });

  return domainWideDelegations;
};

export const deleteDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: { id: string };
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  const { id } = input;
  const { prisma } = ctx;

  await prisma.domainWideDelegation.delete({
    where: { id },
  });

  return { id };
};
