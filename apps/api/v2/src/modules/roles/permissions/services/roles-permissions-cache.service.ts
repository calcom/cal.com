import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, Logger } from "@nestjs/common";

export const REDIS_TEAM_PERMISSIONS_CACHE_PATTERN = (teamId: number) =>
  `apiv2:user:*:team:${teamId}:requiredPermissions:*:guard:pbac`;

@Injectable()
export class RolesPermissionsCacheService {
  private readonly logger = new Logger(RolesPermissionsCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async deleteTeamPermissionsCache(teamId: number): Promise<void> {
    try {
      const pattern = REDIS_TEAM_PERMISSIONS_CACHE_PATTERN(teamId);
      const keys = await this.redisService.getKeys(pattern);
      
      if (keys.length > 0) {
        await this.redisService.delMany(keys);
        this.logger.log(`Deleted ${keys.length} permission cache keys for team ${teamId}`);
      } else {
        this.logger.log(`No permission cache keys found for team ${teamId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete permission cache for team ${teamId}:`, error);
    }
  }
}
