import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type {
  DomainWideDelegationCreateSchema,
  DomainWideDelegationUpdateSchema,
  DomainWideDelegationDeleteSchema,
} from "./domainWideDelegation.schema";

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
  serviceAccountClientId: true,
};

async function findWorkspacePlatformBySlug({ slug }: { slug: string }) {
  const workspacePlatform = await prisma.workspacePlatform.findUnique({
    where: { slug },
  });

  if (!workspacePlatform) {
    return null;
  }
  const parsedServiceAccountKey = parseServiceAccountKey(workspacePlatform.defaultServiceAccountKey);

  return { ...workspacePlatform, defaultServiceAccountKey: parsedServiceAccountKey };
}

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

export const createDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof DomainWideDelegationCreateSchema>;
  ctx: { prisma: PrismaClient; user: { id: number; organizationId: number } };
}) => {
  const { workspacePlatformSlug, domain } = input;
  const { prisma, user } = ctx;
  const { organizationId } = user;

  try {
    const workspacePlatform = await findWorkspacePlatformBySlug({
      slug: workspacePlatformSlug,
    });

    if (!workspacePlatform) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Workspace platform ${workspacePlatformSlug} not found`,
      });
    }

    const createdDelegation = await prisma.domainWideDelegation.create({
      data: {
        workspacePlatform: {
          connect: {
            id: workspacePlatform.id,
          },
        },
        domain,
        enabled: true,
        organization: {
          connect: {
            id: organizationId,
          },
        },

        // Copy service account key and client id from workspace platform to allow us to change the default service account key if needed without changing the service account client ID for existing delegations
        serviceAccountKey: workspacePlatform.defaultServiceAccountKey,
        serviceAccountClientId: workspacePlatform.defaultServiceAccountClientId,
      },
    });

    return {
      ...createdDelegation,
      serviceAccountKey: undefined,
    };
  } catch (error) {
    handleDomainWideDelegationError(error);
  }
};

export const updateDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof DomainWideDelegationUpdateSchema>;
  ctx: { prisma: PrismaClient; user: { id: number; organizationId: number } };
}) => {
  const { id, workspacePlatformSlug, domain, enabled } = input;
  const { prisma, user } = ctx;
  const { organizationId } = user;

  try {
    const workspacePlatform = await findWorkspacePlatformBySlug({
      slug: workspacePlatformSlug,
    });

    const updatedDelegation = await prisma.domainWideDelegation.update({
      where: { id },
      data: {
        workspacePlatform: {
          connect: {
            id: workspacePlatform.id,
          },
        },
        domain,
        enabled,
        organizationId,
      },
    });

    return {
      ...updatedDelegation,
      serviceAccountKey: undefined,
    };
  } catch (error) {
    handleDomainWideDelegationError(error);
  }
};

const handleDomainWideDelegationError = (error: unknown) => {
  if (error instanceof InvalidServiceAccountKeyError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof TRPCError) {
    throw error;
  }

  console.error("Error handling domain-wide delegation:", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An error occurred while handling domain-wide delegation settings.",
  });
};

export const listDomainWideDelegationsHandler = async ({
  ctx,
}: {
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  const { prisma, user } = ctx;

  const domainWideDelegations = await prisma.domainWideDelegation.findMany({
    where: {
      organizationId: user.organization.id,
    },
    select: domainWideDelegationSafeSelect,
  });

  return domainWideDelegations;
};

export const deleteDomainWideDelegationHandler = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof DomainWideDelegationDeleteSchema>;
  ctx: { prisma: PrismaClient; user: { id: number } };
}) => {
  const { id } = input;
  const { prisma } = ctx;

  await prisma.domainWideDelegation.delete({
    where: { id },
  });

  return { id };
};
