import type { Prisma } from "@prisma/client";

import type { IDomainWideDelegationRepository } from "./domain-wide-delegation-repository.interface";

export class MockDomainWideDelegationRepository implements IDomainWideDelegationRepository {
  async create(_data: {
    domain: string;
    enabled: boolean;
    organizationId: number;
    workspacePlatformId: number;
    serviceAccountKey: Exclude<Prisma.JsonValue, null>;
  }) {
    return null;
  }

  async findById(_args: { id: string }) {
    return null;
  }

  async findByIdIncludeSensitiveServiceAccountKey(_args: { id: string }) {
    return null;
  }

  async findUniqueByOrganizationMemberEmail(_args: { email: string }) {
    return null;
  }

  async findByUser(_args: { user: { email: string } }) {
    return null;
  }

  static async findAllByDomain(_args: { domain: string }) {
    return [];
  }

  static async findFirstByOrganizationId(_args: { organizationId: number }) {
    return null;
  }

  async updateById(_args: {
    id: string;
    data: Partial<{
      workspacePlatformId: number;
      domain: string;
      enabled: boolean;
      organizationId: number;
    }>;
  }) {
    return null;
  }

  async deleteById(_args: { id: string }) {
    return null;
  }

  async findDelegationsWithServiceAccount(_args: { organizationId: number }) {
    return [];
  }
}
