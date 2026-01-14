import type { PlatformOAuthClient } from "@calcom/prisma/client";

export interface IPlatformOAuthClientRepository {
  getByUserId(userId: number): Promise<PlatformOAuthClient | null>;
}
