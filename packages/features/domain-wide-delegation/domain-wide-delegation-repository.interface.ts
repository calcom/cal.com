import type { Prisma } from "@prisma/client";

type DomainWideDelegationSafeSelect = {
  id: string;
  enabled: boolean;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: number;
  workspacePlatform: {
    name: string;
    slug: string;
  };
};

export interface IDomainWideDelegationRepository {
  create(args: {
    domain: string;
    enabled: boolean;
    organizationId: number;
    workspacePlatformId: number;
    serviceAccountKey: Exclude<Prisma.JsonValue, null>;
  }): Promise<DomainWideDelegationSafeSelect | null>;

  findById(args: { id: string }): Promise<DomainWideDelegationSafeSelect | null>;

  findByIdIncludeSensitiveServiceAccountKey(args: {
    id: string;
  }): Promise<(DomainWideDelegationSafeSelect & { serviceAccountKey: any }) | null>;

  findUniqueByOrganizationMemberEmail(args: {
    email: string;
  }): Promise<DomainWideDelegationSafeSelect | null>;

  findByUser(args: { user: { email: string } }): Promise<DomainWideDelegationSafeSelect | null>;

  updateById(args: {
    id: string;
    data: Partial<{
      workspacePlatformId: number;
      domain: string;
      enabled: boolean;
      organizationId: number;
    }>;
  }): Promise<DomainWideDelegationSafeSelect | null>;

  deleteById(args: { id: string }): Promise<any>;

  findDelegationsWithServiceAccount(args: { organizationId: number }): Promise<
    (DomainWideDelegationSafeSelect & {
      workspacePlatform: {
        id: number;
        name: string;
        slug: string;
      };
      serviceAccountKey: any;
    })[]
  >;
}
