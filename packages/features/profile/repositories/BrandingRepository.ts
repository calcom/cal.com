import type { PrismaClient } from "@calcom/prisma";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";

/**
 * Repository for branding-related database operations
 */
export class BrandingRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get hideBranding value for a user or team by their IDs
   */
  async getHideBrandingByIds({ userId, teamId }: { userId?: number; teamId?: number }): Promise<boolean> {
    const teamRepository = new TeamRepository(this.prisma);
    const userRepository = new UserRepository(this.prisma);

    return getHideBranding({
      userId,
      teamId,
      teamRepository,
      userRepository,
    });
  }
}

