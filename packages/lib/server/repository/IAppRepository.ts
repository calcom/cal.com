/**
 * ORM-agnostic interface for AppRepository
 * This interface defines the contract for app data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type { Prisma } from "@calcom/prisma/client";
import type { AppCategories } from "@calcom/prisma/enums";

export interface AppDto {
  slug: string;
}

export interface AppCreateInput {
  slug: string;
  categories: AppCategories[];
  dirName: string;
  keys?: Prisma.InputJsonValue;
  enabled: boolean;
}

export interface IAppRepository {
  seedApp(dirName: string, keys?: Prisma.InputJsonValue): Promise<void>;

  findAppStore(): Promise<AppDto[]>;
}
