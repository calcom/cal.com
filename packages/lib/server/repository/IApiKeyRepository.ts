/**
 * ORM-agnostic interface for ApiKeyRepository
 * This interface defines the contract for API key data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { UserPermissionRole } from "@calcom/prisma/enums";

export interface ApiKeyWithUserDto {
  id: string;
  hashedKey: string;
  userId: number;
  expiresAt: Date | null;
  user: {
    role: UserPermissionRole;
    locked: boolean;
    email: string;
  };
}

export interface ApiKeyDto {
  id: string;
  note: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  hashedKey: string;
  userId: number;
  teamId: number | null;
  appId: string | null;
}

export interface IApiKeyRepository {
  findByHashedKey(hashedKey: string): Promise<ApiKeyWithUserDto | null>;
  findApiKeysFromUserId(params: { userId: number }): Promise<ApiKeyDto[]>;
  createApiKey(params: {
    userId: number;
    teamId?: number;
    note?: string;
    expiresAt?: Date | null;
  }): Promise<string>;
}
