import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

const getLicenseCacheKey = (key: string) => `api-v2-license-key-goblin-url-${key}`;

type LicenseCheckResponse = {
  status: boolean;
};
@Injectable()
export class DeploymentsService {
  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {}

  async checkLicense() {
    if (this.configService.get("e2e")) {
      return true;
    }
    let licenseKey = this.configService.get("api.licenseKey");

    if (!licenseKey) {
      /** We try to check on DB only if env is undefined */
      try {
        const deployment = await this.deploymentsRepository.getDeployment();
        licenseKey = deployment?.licenseKey ?? undefined;
      } catch (error) {
        console.warn("Failed to fetch deployment from database:", error);
      }
    }

    if (!licenseKey) {
      console.warn("No license key found in environment or database");
      return false;
    }
    const licenseKeyUrl = this.configService.get("api.licenseKeyUrl") + `/${licenseKey}`;
    const cachedData = await this.redisService.redis.get(getLicenseCacheKey(licenseKey));
    if (cachedData) {
      return (JSON.parse(cachedData) as LicenseCheckResponse)?.status;
    }
    try {
      const response = await fetch(licenseKeyUrl, { mode: "cors" });
      const data = (await response.json()) as LicenseCheckResponse;
      const cacheKey = getLicenseCacheKey(licenseKey);
      this.redisService.redis.set(cacheKey, JSON.stringify(data), "EX", CACHING_TIME);
      return data.status;
    } catch (error) {
      console.error("License validation request failed:", error);
      return false;
    }
  }
}
