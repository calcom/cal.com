import { PrismaMembershipRepository } from "@/lib/repositories/prisma-membership.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import { NoSlotsNotificationService as BaseNoSlotsNotificationService } from "@calcom/platform-libraries/slots";

@Injectable()
export class NoSlotsNotificationService extends BaseNoSlotsNotificationService {
  constructor(membershipRepository: PrismaMembershipRepository, redisService: RedisService) {
    super({
      membershipRepo: membershipRepository,
      redisClient: redisService,
    });
  }
}
