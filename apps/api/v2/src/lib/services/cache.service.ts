import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { Injectable } from "@nestjs/common";

import { CacheService as BaseCacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";

@Injectable()
export class CacheService extends BaseCacheService {
  constructor(featuresRepository: PrismaFeaturesRepository) {
    super({ featuresRepository });
  }
}
