import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

const getLicenseCacheKey = (key: string) => `api-v2-license-key-goblin-url-${key}`;

type LicenseCheckResponse = {
  status: boolean;
};
@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger("DeploymentsService");

  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {}

  async checkLicense(): Promise<boolean> {
    if (this.configService.get("e2e")) {
      return true;
    }
    let licenseKey = this.configService.get("api.licenseKey");

    if (!licenseKey) {
      /** We try to check on DB only if env is undefined */
      const deployment = await this.deploymentsRepository.getDeployment();
      licenseKey = deployment?.licenseKey ?? undefined;
    }

    if (!licenseKey) {
      return false;
    }

    const licenseKeyUrl = this.configService.get("api.licenseKeyUrl") + `/${licenseKey}`;
    const cacheKey = getLicenseCacheKey(licenseKey);

    const cachedData = await this.redisService.redis.get(cacheKey);
    if (cachedData) {
      try {
        return (JSON.parse(cachedData) as LicenseCheckResponse)?.status;
      } catch (error) {
        this.logger.error(
          `Failed to parse cached license data`,
          error instanceof Error ? error.stack : String(error)
        );
        await this.redisService.redis.del(cacheKey);
      }
    }

    try {
      const response = await fetch(licenseKeyUrl, { mode: "cors" });

      if (!response.ok) {
        this.logger.error(`License check failed with status ${response.status} ${response.statusText}`);
        return false;
      }

      const data = (await response.json()) as LicenseCheckResponse;
      await this.redisService.redis.set(cacheKey, JSON.stringify(data), "EX", CACHING_TIME);
      return data.status;
    } catch (error) {
      this.logger.error(`License check failed`, error instanceof Error ? error.stack : String(error));
      return false;
    }
  }
}
