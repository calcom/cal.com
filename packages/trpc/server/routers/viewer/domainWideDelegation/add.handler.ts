import type { z } from "zod";

import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
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
  const { workspacePlatformSlug, domain, serviceAccountKey } = input;
  const { user } = ctx;
  const { organizationId } = user;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to add a domain-wide delegation",
    });
  }

  try {
    const workspacePlatform = await WorkspacePlatformRepository.findBySlug({
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

    const createdDelegation = await DomainWideDelegationRepository.create({
      workspacePlatformId: workspacePlatform.id,
      domain,
      // We don't want to enable by default because enabling requires some checks to be completed and it has a separate flow.
      enabled: false,
      organizationId,
      serviceAccountKey,
    });

    return ensureNoServiceAccountKey(createdDelegation);
  } catch (error) {
    handleDomainWideDelegationError(error);
  }
}
