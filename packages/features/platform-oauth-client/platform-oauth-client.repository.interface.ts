import type { PlatformOAuthClient } from "@prisma/client";

export interface IPlatformOAuthClientRepository {
  getByUserId(userId: number): Promise<PlatformOAuthClient | null>;
}
