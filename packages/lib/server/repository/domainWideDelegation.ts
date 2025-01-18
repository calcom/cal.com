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

export type ServiceAccountKey = z.infer<typeof serviceAccountKeySchema>;

const repositoryLogger = logger.getSubLogger({ prefix: ["DomainWideDelegationRepository"] });
const domainWideDelegationSafeSelect = {
  id: true,
  enabled: true,
  domain: true,
  createdAt: true,
  updatedAt: true,
  organizationId: true,
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
    const { serviceAccountKey, ...rest } = domainWideDelegation;
    const parsedServiceAccountKey = serviceAccountKeySchema.safeParse(serviceAccountKey);
    return {
      ...rest,
      serviceAccountKey: parsedServiceAccountKey.success ? parsedServiceAccountKey.data : null,
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

  static async findById({ id }: { id: string }) {
    return await prisma.domainWideDelegation.findUnique({
      where: { id },
      select: domainWideDelegationSafeSelect,
    });
  }

  static async findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey({
    organizationId,
    domain,
  }: {
    organizationId: number;
    domain: string;
  }) {
    const dwd = await prisma.domainWideDelegation.findUnique({
      where: { organizationId_domain: { organizationId, domain } },
      select: domainWideDelegationSelectIncludesServiceAccountKey,
    });
    return DomainWideDelegationRepository.withParsedServiceAccountKey(dwd);
  }

  static async findByIdIncludeSensitiveServiceAccountKey({ id }: { id: string }) {
    const domainWideDelegation = await prisma.domainWideDelegation.findUnique({
      where: { id },
      select: domainWideDelegationSelectIncludesServiceAccountKey,
    });
    if (!domainWideDelegation) return null;
    return DomainWideDelegationRepository.withParsedServiceAccountKey(domainWideDelegation);
  }

  static async findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({ email }: { email: string }) {
    const log = repositoryLogger.getSubLogger({
      prefix: ["findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey"],
    });
    log.debug("called with", safeStringify({ email }));
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
      select: domainWideDelegationSelectIncludesServiceAccountKey,
    });

    return DomainWideDelegationRepository.withParsedServiceAccountKey(domainWideDelegation);
  }

  static async findAllByDomain({ domain }: { domain: string }) {
    return await prisma.domainWideDelegation.findMany({
      where: { domain },
      select: domainWideDelegationSafeSelect,
    });
  }

  static async updateById({
    id,
    data,
  }: {
    id: string;
    data: Partial<{
      workspacePlatformId: number;
      domain: string;
      enabled: boolean;
      organizationId: number;
    }>;
  }) {
    const { workspacePlatformId, organizationId, ...rest } = data;
    return await prisma.domainWideDelegation.update({
      where: { id },
      data: {
        ...(workspacePlatformId && {
          workspacePlatform: {
            connect: {
              id: workspacePlatformId,
            },
          },
        }),
        ...(organizationId && {
          organization: {
            connect: {
              id: organizationId,
            },
          },
        }),
        ...rest,
      },
      select: domainWideDelegationSafeSelect,
    });
  }

  static async deleteById({ id }: { id: string }) {
    return await prisma.domainWideDelegation.delete({
      where: { id },
    });
  }

  static async findByOrgIdIncludeSensitiveServiceAccountKey({ organizationId }: { organizationId: number }) {
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
