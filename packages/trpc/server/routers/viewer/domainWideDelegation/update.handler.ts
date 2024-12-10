import type { z } from "zod";

import { DomainWideDelegation } from "@calcom/features/domain-wide-delegation/domain-wide-delegation";
import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";
import { TRPCError } from "@calcom/trpc/server";

import type { DomainWideDelegationUpdateSchema } from "./schema";
import {
  ensureDomainWideDelegationNotAlreadyConfigured,
  ensureNoServiceAccountKey,
  handleDomainWideDelegationError,
} from "./utils";

export default async function handler({
  input,
  ctx,
}: {
  input: z.infer<typeof DomainWideDelegationUpdateSchema>;
  ctx: { user: { id: number; organizationId: number | null } };
}) {
  const { id, workspacePlatformSlug, domain } = input;
  const { user } = ctx;
  const { organizationId } = user;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to update a domain wide delegation",
    });
  }

  await ensureDomainWideDelegationNotAlreadyConfigured({
    domain,
    currentOrganizationId: organizationId,
    dwdBeingUpdatedId: id,
  });

  try {
    const workspacePlatform = await WorkspacePlatformRepository.findBySlugIncludeSensitiveServiceAccountKey({
      slug: workspacePlatformSlug,
    });

    if (!workspacePlatform) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Workspace platform ${workspacePlatformSlug} not found`,
      });
    }

    const domainWideDelegationRepository = await DomainWideDelegation.init(user.id, organizationId);

    const updatedDelegation = await domainWideDelegationRepository.updateById({
      id,
      data: {
        workspacePlatformId: workspacePlatform.id,
        domain,
        organizationId,
      },
    });

    return ensureNoServiceAccountKey(updatedDelegation);
  } catch (error) {
    handleDomainWideDelegationError(error);
  }
}
