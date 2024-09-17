import type { Prisma } from "@prisma/client";
import z from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { OrganizationRepository } from "./organization";

const serviceAccountKeySchema = z
  .object({
    client_email: z.string(),
    private_key: z.string(),
    client_id: z.string(),
  })
  .passthrough();

const repositoryLogger = logger.getSubLogger({ prefix: ["DomainWideDelegationRepository"] });
const domainWideDelegationSafeSelect = {
  id: true,
  enabled: true,
  domain: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
  serviceAccountKey: true,
  workspacePlatform: {
    select: {
      name: true,
      slug: true,
    },
  },
};

const domainWideDelegationSelectIncludesServiceAccountKey = {
  ...domainWideDelegationSafeSelect,
  serviceAccountKey: true,
};

export class DomainWideDelegationRepository {
  private static withParsedServiceAccountKey<T extends { serviceAccountKey: Prisma.JsonValue } | null>(
    domainWideDelegation: T
  ) {
    if (!domainWideDelegation) {
      return null;
    }
    return {
      ...domainWideDelegation,
      serviceAccountKey: serviceAccountKeySchema.parse(domainWideDelegation.serviceAccountKey),
    };
  }

  static async create(data: {
    domain: string;
    enabled: boolean;
    organizationId: number;
    workspacePlatformId: number;
    serviceAccountKey: Exclude<Prisma.JsonValue, null>;
  }) {
    return await prisma.domainWideDelegation.create({
      data: {
        workspacePlatform: {
          connect: {
            id: data.workspacePlatformId,
          },
        },
        domain: data.domain,
        enabled: data.enabled,
        organization: {
          connect: {
            id: data.organizationId,
          },
        },
        serviceAccountKey: data.serviceAccountKey,
      },
      select: domainWideDelegationSafeSelect,
    });
  }

  static async findUniqueByOrganizationMemberEmail({ email }: { email: string }) {
    const log = repositoryLogger.getSubLogger({ prefix: ["findUniqueByOrganizationMemberEmail"] });
    log.debug("called with", { email });
    const organization = await OrganizationRepository.findByMemberEmail({ email });
    if (!organization) {
      log.debug("Email not found in any organization:", email);
      return null;
    }

    const emailDomain = email.split("@")[1];
    const domainWideDelegation = await prisma.domainWideDelegation.findUnique({
      where: {
        organizationId_domain: {
          organizationId: organization.id,
          domain: emailDomain,
        },
      },
      select: domainWideDelegationSafeSelect,
    });

    return DomainWideDelegationRepository.withParsedServiceAccountKey(domainWideDelegation);
  }

  static async findByUserIncludeSensitiveServiceAccountKey({
    user,
  }: {
    user: {
      email: string;
    };
  }) {
    const log = repositoryLogger.getSubLogger({ prefix: ["findByUser"] });
    log.debug("called with", { user });
    const organization = await OrganizationRepository.findByMemberEmailId({
      email: user.email,
    });
    if (!organization) {
      log.debug("No organization found for user", safeStringify(user));
      return null;
    }

    const emailDomain = user.email.split("@")[1];
    log.debug("organization found", safeStringify({ organizationId: organization.id }));
    const domainWideDelegation = await prisma.domainWideDelegation.findUnique({
      where: {
        organizationId_domain: {
          organizationId: organization.id,
          domain: emailDomain,
        },
      },
      select: domainWideDelegationSelectIncludesServiceAccountKey,
    });

    return DomainWideDelegationRepository.withParsedServiceAccountKey(domainWideDelegation);
  }

  static async findFirstByDomain({ domain }: { domain: string }) {
    return await prisma.domainWideDelegation.findFirst({
      where: { domain },
    });
  }

  static async updateById({
    id,
    data,
  }: {
    id: string;
    data: {
      workspacePlatformId: number;
      domain: string;
      enabled: boolean;
      organizationId: number;
    };
  }) {
    return await prisma.domainWideDelegation.update({
      where: { id },
      data: {
        workspacePlatform: {
          connect: {
            id: data.workspacePlatformId,
          },
        },
        domain: data.domain,
        enabled: data.enabled,
        organization: {
          connect: {
            id: data.organizationId,
          },
        },
      },
      select: domainWideDelegationSafeSelect,
    });
  }

  static async deleteById({ id }: { id: string }) {
    return await prisma.domainWideDelegation.delete({
      where: { id },
    });
  }

  static async findManyByOrganizationIdIncludeWorkspacePlatformAndSensitiveServiceAccountKey({
    organizationId,
  }: {
    organizationId: number;
  }) {
    return await prisma.domainWideDelegation.findMany({
      where: { organizationId },
      select: {
        ...domainWideDelegationSelectIncludesServiceAccountKey,
        workspacePlatform: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }
}
