import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {}

  // Cal.diy is fully open source — no license key is required.
  async checkLicense() {
    return true;
  }
}
