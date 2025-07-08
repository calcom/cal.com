import type { z } from "zod";

import { PrismaDelegationCredentialRepository } from "@calcom/lib/server/repository/prismaDelegationCredential";
import { PrismaWorkspacePlatformRepository } from "@calcom/lib/server/repository/prismaWorkspacePlatform";

import { TRPCError } from "@trpc/server";

import type { DelegationCredentialUpdateSchema } from "./schema";
import {
  ensureDelegationCredentialNotAlreadyConfigured,
  ensureNoServiceAccountKey,
  handleDelegationCredentialError,
} from "./utils";

export default async function handler({
  input,
  ctx,
}: {
  input: z.infer<typeof DelegationCredentialUpdateSchema>;
  ctx: { user: { id: number; organizationId: number | null } };
}) {
  const { id, workspacePlatformSlug, domain } = input;
  const { user } = ctx;
  const { organizationId } = user;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to update a delegation credential",
    });
  }

  await ensureDelegationCredentialNotAlreadyConfigured({
    domain,
    currentOrganizationId: organizationId,
    delegationCredentialBeingUpdatedId: id,
  });

  try {
    const workspacePlatform =
      await PrismaWorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey({
        slug: workspacePlatformSlug,
      });

    if (!workspacePlatform) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Workspace platform ${workspacePlatformSlug} not found`,
      });
    }

    const updatedDelegation = await PrismaDelegationCredentialRepository.updateById({
      id,
      data: {
        workspacePlatformId: workspacePlatform.id,
        domain,
        organizationId,
      },
    });

    return ensureNoServiceAccountKey(updatedDelegation);
  } catch (error) {
    handleDelegationCredentialError(error);
  }
}
