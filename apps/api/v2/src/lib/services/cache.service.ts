import { CacheService as BaseCacheService } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";

@Injectable()
export class CacheService extends BaseCacheService {
  constructor(featuresRepository: PrismaFeaturesRepository) {
    super({ featuresRepository });
  }
}
