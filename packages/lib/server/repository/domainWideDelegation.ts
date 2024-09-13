import type { Prisma } from "@prisma/client";
import z from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { WorkspacePlatform } from "@calcom/prisma/enums";

import { OrganizationRepository } from "./organization";

const serviceAccountKeySchema = z
  .object({
    client_email: z.string(),
    private_key: z.string(),
  })
  .passthrough();

const repositoryLogger = logger.getSubLogger({ prefix: ["DomainWideDelegationRepository"] });

export class DomainWideDelegationRepository {
  private static parsed<T extends { serviceAccountKey: Prisma.JsonValue } | null>(domainWideDelegation: T) {
    if (!domainWideDelegation) {
      return domainWideDelegation;
    }
    return {
      ...domainWideDelegation,
      serviceAccountKey: serviceAccountKeySchema.parse(domainWideDelegation.serviceAccountKey),
    };
  }

  static async findByOrganizationMemberEmail({
    email,
    workspacePlatform,
  }: {
    email: string;
    workspacePlatform: WorkspacePlatform;
  }) {
    const log = repositoryLogger.getSubLogger({ prefix: ["findByOrganizationMemberEmail"] });
    const organization = await OrganizationRepository.findByMemberEmail({ email });
    if (!organization) {
      log.debug("Email not found in any organization:", email);
      return null;
    }

    const domainWideDelegation = await prisma.domainWideDelegation.findUnique({
      where: {
        organizationId_workspacePlatform: {
          organizationId: organization.id,
          workspacePlatform,
        },
      },
    });

    return DomainWideDelegationRepository.parsed(domainWideDelegation);
  }

  static async findByCredential({
    credential,
    workspacePlatform,
  }: {
    credential: {
      userId?: string | null;
      teamId?: string | null;
    };
    workspacePlatform: WorkspacePlatform;
  }) {
    const log = repositoryLogger.getSubLogger({ prefix: ["findByCredential"] });
    log.debug("called with", { safeCredential: credential, workspacePlatform });
    const organization = await OrganizationRepository.findByCredentialOfMember({
      userId: credential.userId,
      teamId: credential.teamId,
    });
    if (!organization) {
      log.debug("Credential isn't found for any organization:", credential);
      return null;
    }

    log.debug("organization found", safeStringify({ organizationId: organization.id }));
    const domainWideDelegation = await prisma.domainWideDelegation.findUnique({
      where: {
        organizationId_workspacePlatform: {
          organizationId: organization.id,
          workspacePlatform,
        },
      },
    });

    return DomainWideDelegationRepository.parsed(domainWideDelegation);
  }
}
