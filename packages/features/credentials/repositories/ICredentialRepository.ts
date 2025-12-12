/**
 * ORM-agnostic interface for CredentialRepository
 * This interface defines the contract for credential data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface CredentialDto {
  id: number;
  type: string;
  key: unknown;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  subscriptionId: string | null;
  paymentStatus: string | null;
  billingCycleStart: number | null;
  invalid: boolean | null;
  delegationCredentialId: string | null;
}

export interface CredentialCreateInputDto {
  type: string;
  key: unknown;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
}

export interface CredentialUpdateInputDto {
  type?: string;
  key?: unknown;
  userId?: number;
  appId?: string;
  delegationCredentialId?: string | null;
  invalid?: boolean;
}

export interface CredentialWithUserDto extends CredentialDto {
  user: {
    id: number;
    email: string;
  } | null;
}

export interface CredentialWithAppDto extends CredentialDto {
  app: {
    slug: string;
    categories: string[];
    dirName: string;
  } | null;
}

export interface CredentialWithDelegationDto extends CredentialDto {
  delegationCredential: {
    id: string;
    domain: string;
    serviceAccountKey: unknown;
    organizationId: number;
    workspacePlatformId: number | null;
    enabled: boolean;
  } | null;
}

export interface CredentialForCalendarServiceDto {
  id: number;
  type: string;
  key: unknown;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  invalid: boolean | null;
  user: {
    email: string;
  } | null;
}

export interface ICredentialRepository {
  create(data: CredentialCreateInputDto): Promise<CredentialDto>;
  findByAppIdAndUserId(appId: string, userId: number): Promise<CredentialDto | null>;
  findFirstByIdWithUser(id: number): Promise<CredentialDto | null>;
  findFirstByIdWithKeyAndUser(id: number): Promise<CredentialDto | null>;
  findFirstByAppIdAndUserId(appId: string, userId: number): Promise<CredentialDto | null>;
  findFirstByUserIdAndType(userId: number, type: string): Promise<CredentialDto | null>;
  deleteById(id: number): Promise<void>;
  updateCredentialById(id: number, data: CredentialUpdateInputDto): Promise<void>;
  deleteAllByDelegationCredentialId(delegationCredentialId: string): Promise<{ count: number }>;
  findCredentialForCalendarServiceById(id: number): Promise<CredentialForCalendarServiceDto | null>;
  findByIdIncludeDelegationCredential(id: number): Promise<CredentialWithDelegationDto | null>;
  findAllDelegationByUserIdsListAndDelegationCredentialIdAndType(
    userIds: number[],
    delegationCredentialId: string,
    type: string
  ): Promise<{ userId: number | null }[]>;
  findAllDelegationByTypeIncludeUserAndTake(
    type: string,
    take: number
  ): Promise<(CredentialWithUserDto & { delegationCredentialId: string })[]>;
  findUniqueByUserIdAndDelegationCredentialId(
    userId: number,
    delegationCredentialId: string
  ): Promise<CredentialDto | null>;
  updateWhereUserIdAndDelegationCredentialId(
    userId: number,
    delegationCredentialId: string,
    data: { key: unknown }
  ): Promise<{ count: number }>;
  createDelegationCredential(data: {
    userId: number;
    delegationCredentialId: string;
    type: string;
    key: unknown;
    appId: string;
  }): Promise<CredentialDto>;
  updateWhereId(id: number, data: { key: unknown }): Promise<CredentialDto>;
  findPaymentCredentialByAppIdAndTeamId(
    appId: string | null,
    teamId: number
  ): Promise<CredentialWithAppDto | null>;
  findPaymentCredentialByAppIdAndUserId(
    appId: string | null,
    userId: number
  ): Promise<CredentialWithAppDto | null>;
  findPaymentCredentialByAppIdAndUserIdOrTeamId(
    appId: string | null,
    userId: number,
    teamId?: number | null
  ): Promise<CredentialWithAppDto | null>;
}
