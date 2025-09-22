import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { Injectable } from "@nestjs/common";

import { CacheService as BaseCacheService } from "@calcom/platform-libraries";

@Injectable()
export class CacheService extends BaseCacheService {
  constructor(featuresRepository: PrismaFeaturesRepository) {
    super({ featuresRepository });
  }
}
