import type { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import {
  serviceAccountKeySchema,
  type ServiceAccountKey,
  type EncryptedServiceAccountKey,
  encryptServiceAccountKey,
  decryptServiceAccountKey,
} from "@calcom/lib/server/serviceAccountKey";
import { prisma } from "@calcom/prisma";

import { OrganizationRepository } from "./organization";

export type { ServiceAccountKey };
const repositoryLogger = logger.getSubLogger({ prefix: ["DelegationCredentialRepository"] });
const delegationCredentialSafeSelect = {
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

const delegationCredentialSelectIncludesServiceAccountKey = {
  ...delegationCredentialSafeSelect,
  serviceAccountKey: true,
};

export class DelegationCredentialRepository {
  private static encryptServiceAccountKey(serviceAccountKey: ServiceAccountKey): EncryptedServiceAccountKey {
    return encryptServiceAccountKey(serviceAccountKey);
  }

  private static decryptServiceAccountKey(encryptedServiceAccountKey: Prisma.JsonValue): ServiceAccountKey {
    return decryptServiceAccountKey(encryptedServiceAccountKey);
  }

  private static withParsedServiceAccountKey<T extends { serviceAccountKey: Prisma.JsonValue } | null>(
    delegationCredential: T
  ) {
    if (!delegationCredential) {
      return null;
    }
    const { serviceAccountKey, ...rest } = delegationCredential;

    // Decrypt the service account key if it exists
    const decryptedKey = this.decryptServiceAccountKey(serviceAccountKey);
    const parsedServiceAccountKey = serviceAccountKeySchema.safeParse(decryptedKey);

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
    serviceAccountKey: ServiceAccountKey;
  }) {
    const encryptedKey = this.encryptServiceAccountKey(data.serviceAccountKey);
    return await prisma.delegationCredential.create({
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
        serviceAccountKey: encryptedKey,
      },
      select: delegationCredentialSafeSelect,
    });
  }

  static async findById({ id }: { id: string }) {
    return await prisma.delegationCredential.findUnique({
      where: { id },
      select: delegationCredentialSafeSelect,
    });
  }

  static async findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey({
    organizationId,
    domain,
  }: {
    organizationId: number;
    domain: string;
  }) {
    const delegationCredential = await prisma.delegationCredential.findUnique({
      where: { organizationId_domain: { organizationId, domain } },
      select: delegationCredentialSelectIncludesServiceAccountKey,
    });
    return DelegationCredentialRepository.withParsedServiceAccountKey(delegationCredential);
  }

  static async findByIdIncludeSensitiveServiceAccountKey({ id }: { id: string }) {
    const delegationCredential = await prisma.delegationCredential.findUnique({
      where: { id },
      select: delegationCredentialSelectIncludesServiceAccountKey,
    });
    if (!delegationCredential) return null;
    return DelegationCredentialRepository.withParsedServiceAccountKey(delegationCredential);
  }

  static async findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({ email }: { email: string }) {
    const log = repositoryLogger.getSubLogger({
      prefix: ["findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey"],
    });
    log.debug("called with", { email });
    const organization = await OrganizationRepository.findByMemberEmail({ email });
    if (!organization) {
      log.debug("Email not found in any organization:", email);
      return null;
    }

    const emailDomain = email.split("@")[1];
    const delegationCredential = await prisma.delegationCredential.findUnique({
      where: {
        organizationId_domain: {
          organizationId: organization.id,
          domain: emailDomain,
        },
      },
      select: delegationCredentialSelectIncludesServiceAccountKey,
    });

    return DelegationCredentialRepository.withParsedServiceAccountKey(delegationCredential);
  }

  static async findAllByDomain({ domain }: { domain: string }) {
    return await prisma.delegationCredential.findMany({
      where: { domain },
      select: delegationCredentialSafeSelect,
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
    return await prisma.delegationCredential.update({
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
      select: delegationCredentialSafeSelect,
    });
  }

  static async deleteById({ id }: { id: string }) {
    return await prisma.delegationCredential.delete({
      where: { id },
    });
  }

  static async findByOrgIdIncludeSensitiveServiceAccountKey({ organizationId }: { organizationId: number }) {
    return await prisma.delegationCredential.findMany({
      where: { organizationId },
      select: {
        ...delegationCredentialSelectIncludesServiceAccountKey,
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
