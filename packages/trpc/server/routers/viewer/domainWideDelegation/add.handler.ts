import type { z } from "zod";

import { DomainWideDelegation } from "@calcom/features/domain-wide-delegation/domain-wide-delegation";
import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

import { TRPCError } from "@trpc/server";

import type { DomainWideDelegationCreateSchema } from "./schema";
import {
  ensureDomainWideDelegationNotAlreadyConfigured,
  ensureNoServiceAccountKey,
  handleDomainWideDelegationError,
} from "./utils";

export default async function handler({
  input,
  ctx,
}: {
  input: z.infer<typeof DomainWideDelegationCreateSchema>;
  ctx: { user: { id: number; organizationId: number | null } };
}) {
  const { workspacePlatformSlug, domain } = input;
  const { user } = ctx;
  const { organizationId } = user;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to add a domain-wide delegation",
    });
  }

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

    await ensureDomainWideDelegationNotAlreadyConfigured({
      domain,
      currentOrganizationId: organizationId,
      dwdBeingUpdatedId: null,
    });

    const domainWideDelegationRepository = await DomainWideDelegation.init(user.id, organizationId);

    const createdDelegation = await domainWideDelegationRepository.create({
      workspacePlatformId: workspacePlatform.id,
      domain,
      // We don't want to enable by default because enabling requires some checks to be completed and it has a separate flow.
      enabled: false,
      organizationId,
      serviceAccountKey: workspacePlatform.defaultServiceAccountKey,
    });

    return ensureNoServiceAccountKey(createdDelegation);
  } catch (error) {
    handleDomainWideDelegationError(error);
  }
}
