import type { ServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";

export interface DelegationCredentialDto {
  id: string;
  enabled: boolean;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: number;
  lastEnabledAt: Date | null;
  lastDisabledAt: Date | null;
  workspacePlatform: {
    name: string;
    slug: string;
  } | null;
}

export interface DelegationCredentialWithServiceAccountKeyDto extends Omit<DelegationCredentialDto, 'workspacePlatform'> {
  serviceAccountKey: ServiceAccountKey | null;
  workspacePlatform: {
    name: string;
    slug: string;
  } | null;
}

export interface DelegationCredentialWithWorkspacePlatformIdDto extends DelegationCredentialWithServiceAccountKeyDto {
  workspacePlatform: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface DelegatedMemberDto {
  id: number;
  userId: number;
  user: {
    id: number;
    email: string;
  };
  accepted: boolean;
}

export interface DelegationCredentialWithDelegatedMembersDto {
  id: string;
  enabled: boolean;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  organizationId: number;
  lastEnabledAt: Date | null;
  lastDisabledAt: Date | null;
  serviceAccountKey: unknown;
  workspacePlatformId: number;
  workspacePlatform: {
    slug: string;
  } | null;
  organization: {
    id: number;
    name: string;
    slug: string | null;
    delegatedMembers: DelegatedMemberDto[];
    members?: DelegatedMemberDto[];
  };
}

export interface DelegationCredentialCreateInput {
  domain: string;
  enabled: boolean;
  organizationId: number;
  workspacePlatformId: number;
  serviceAccountKey: ServiceAccountKey;
}

export interface DelegationCredentialUpdateInput {
  workspacePlatformId?: number;
  domain?: string;
  enabled?: boolean;
  organizationId?: number;
  lastEnabledAt?: Date;
  lastDisabledAt?: Date;
}

export interface IDelegationCredentialRepository {
  create(data: DelegationCredentialCreateInput): Promise<DelegationCredentialDto>;

  findById(params: { id: string }): Promise<DelegationCredentialDto | null>;

  findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey(params: {
    organizationId: number;
    domain: string;
  }): Promise<DelegationCredentialWithServiceAccountKeyDto | null>;

  findByIdIncludeSensitiveServiceAccountKey(params: { id: string }): Promise<DelegationCredentialWithServiceAccountKeyDto | null>;

  findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey(params: { email: string }): Promise<DelegationCredentialWithServiceAccountKeyDto | null>;

  findAllByDomain(params: { domain: string }): Promise<DelegationCredentialDto[]>;

  updateById(params: { id: string; data: DelegationCredentialUpdateInput }): Promise<DelegationCredentialDto>;

  deleteById(params: { id: string }): Promise<{ id: string }>;

  findByOrgIdIncludeSensitiveServiceAccountKey(params: { organizationId: number }): Promise<DelegationCredentialWithWorkspacePlatformIdDto[]>;

  findAllEnabledIncludeDelegatedMembers(): Promise<DelegationCredentialWithDelegatedMembersDto[]>;

  findAllDisabledAndIncludeNextBatchOfMembersToProcess(): Promise<DelegationCredentialWithDelegatedMembersDto[]>;
}
