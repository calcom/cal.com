import type { Prisma } from "@prisma/client";

import type { IDomainWideDelegationRepository } from "./domain-wide-delegation-repository.interface";

export class MockDomainWideDelegationRepository implements IDomainWideDelegationRepository {
  static async create(_data: {
    domain: string;
    enabled: boolean;
    organizationId: number;
    workspacePlatformId: number;
    serviceAccountKey: Exclude<Prisma.JsonValue, null>;
  }) {
    return null;
  }

  static async findById(_args: { id: string }) {
    return null;
  }

  static async findByIdIncludeSensitiveServiceAccountKey(_args: { id: string }) {
    return null;
  }

  static async findUniqueByOrganizationMemberEmail(_args: { email: string }) {
    return null;
  }

  static async findByUser(_args: { user: { email: string } }) {
    return null;
  }

  static async findAllByDomain(_args: { domain: string }) {
    return [];
  }

  static async findFirstByOrganizationId(_args: { organizationId: number }) {
    return null;
  }

  static async updateById(_args: {
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

  static async deleteById(_args: { id: string }) {
    return null;
  }

  static async findDelegationsWithServiceAccount(_args: { organizationId: number }) {
    return [];
  }
}
