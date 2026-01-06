import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const CACHING_TIME = 86400000; // 24 hours in milliseconds
const FETCH_TIMEOUT = 10000; // 10 seconds

const getLicenseCacheKey = (key: string): string => `api-v2-license-key-goblin-url-${key}`;

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

  async checkLicense(): Promise<boolean> {
    if (this.configService.get("e2e")) {
      return true;
    }

    let licenseKey = this.configService.get("api.licenseKey");
    if (!licenseKey) {
      const deployment = await this.deploymentsRepository.getDeployment();
      licenseKey = deployment?.licenseKey ?? undefined;
    }

    if (!licenseKey) {
      return false;
    }

    const licenseKeyUrl = this.configService.get("api.licenseKeyUrl") + `/${licenseKey}`;
    const cacheKey = getLicenseCacheKey(licenseKey);

    // Check cache first
    const cachedData = await this.redisService.redis.get(cacheKey);
    if (cachedData) {
      try {
        return (JSON.parse(cachedData) as LicenseCheckResponse)?.status ?? false;
      } catch {
        // Cache corrupted, continue to fetch
      }
    }

    try {
      const response = await fetch(licenseKeyUrl, {
        mode: "cors",
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) {
        this.logger.error(`License server returned ${response.status}`);
        return false;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        this.logger.error(`License server returned ${contentType}, expected JSON`);
        return false;
      }

      const data = await response.json();
      if (typeof data?.status !== "boolean") {
        this.logger.error("License server returned invalid JSON structure");
        return false;
      }

      // Only cache valid responses
      await this.redisService.redis.set(cacheKey, JSON.stringify(data), "EX", CACHING_TIME);
      return data.status;
    } catch (error) {
      this.logger.error(`License check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
