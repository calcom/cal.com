import { PrismaMembershipRepository } from "@/lib/repositories/prisma-membership.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import { NoSlotsNotificationService as BaseNoSlotsNotificationService } from "@calcom/platform-libraries/slots";

@Injectable()
export class NoSlotsNotificationService extends BaseNoSlotsNotificationService {
  constructor(
    teamRepository: PrismaTeamRepository,
    membershipRepository: PrismaMembershipRepository,
    redisService: RedisService
  ) {
    super({
      teamRepo: teamRepository,
      membershipRepo: membershipRepository,
      redisClient: redisService,
    });
  }
}
