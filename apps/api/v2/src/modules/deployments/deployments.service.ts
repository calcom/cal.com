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
  private readonly logger = new Logger(DeploymentsService.name);

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
      const deployment = await this.deploymentsRepository.getDeployment();
      licenseKey = deployment?.licenseKey ?? undefined;
    }

    if (!licenseKey) {
      return false;
    }
    const licenseKeyUrl = this.configService.get("api.licenseKeyUrl") + `/${licenseKey}`;
    const cachedData = await this.redisService.redis.get(getLicenseCacheKey(licenseKey));
    if (cachedData) {
      return (JSON.parse(cachedData) as LicenseCheckResponse)?.status;
    }

    try {
      const response = await fetch(licenseKeyUrl, {
        mode: "cors",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`License server returned ${response.status}`);
        return false;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        this.logger.warn(`License server returned ${contentType}, expected JSON`);
        return false;
      }

      const data = (await response.json()) as LicenseCheckResponse;

      if (typeof data?.status !== "boolean") {
        this.logger.warn("License server returned invalid JSON structure");
        return false;
      }

      const cacheKey = getLicenseCacheKey(licenseKey);
      this.redisService.redis.set(cacheKey, JSON.stringify(data), "EX", CACHING_TIME);
      return data.status;
    } catch (error) {
      this.logger.warn(`License check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
