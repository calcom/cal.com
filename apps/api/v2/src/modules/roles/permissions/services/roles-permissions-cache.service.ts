import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, Logger } from "@nestjs/common";

export const REDIS_TEAM_PERMISSIONS_VERSION_KEY = (teamId: number) =>
  `apiv2:team:${teamId}:permissions:version`;

@Injectable()
export class RolesPermissionsCacheService {
  private readonly logger = new Logger(RolesPermissionsCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async incrementTeamPermissionsVersion(teamId: number): Promise<number> {
    try {
      const newVersion = await this.redisService.incr(REDIS_TEAM_PERMISSIONS_VERSION_KEY(teamId));
      if (newVersion === 0) {
        this.logger.warn(`Redis incr returned 0 for team ${teamId}, using fallback version 1`);
        return 1;
      }
      this.logger.log(`Incremented permissions version for team ${teamId} to ${newVersion}`);
      return newVersion;
    } catch (error) {
      this.logger.error(`Failed to increment permissions version for team ${teamId}:`, error);
      return 1;
    }
  }

  async getTeamPermissionsVersion(teamId: number): Promise<number> {
    try {
      const version = await this.redisService.get<number>(REDIS_TEAM_PERMISSIONS_VERSION_KEY(teamId));
      return version || 1;
    } catch (error) {
      this.logger.error(`Failed to get permissions version for team ${teamId}:`, error);
      return 1;
    }
  }
}
