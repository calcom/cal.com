import crypto from "node:crypto";

import type { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import type { RedisService } from "@/modules/redis/redis.service";
import { Injectable, Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

const getLicenseCacheKey = (key: string): string => `api-v2-license-key-goblin-url-${key}`;

const ALGORITHM = "aes256";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "hex";

const symmetricDecrypt = (text: string, key: string): string => {
  const _key = Buffer.from(key, "latin1");

  const components = text.split(":");
  const iv_from_ciphertext = Buffer.from(components.shift() || "", OUTPUT_ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, _key, iv_from_ciphertext);
  let deciphered = decipher.update(components.join(":"), OUTPUT_ENCODING, INPUT_ENCODING);
  deciphered += decipher.final(INPUT_ENCODING);

  return deciphered;
};

const generateNonce = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

const createSignature = (body: Record<string, unknown>, nonce: string, secretKey: string): string => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(JSON.stringify(body) + nonce)
    .digest("hex");
};

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

  async checkLicense(): Promise<boolean | undefined> {
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

    const licenseKeyUrl = `${this.configService.get("api.licenseKeyUrl")}/${licenseKey}`;
    const cachedData = await this.redisService.redis.get(getLicenseCacheKey(licenseKey));
    if (cachedData) {
      return (JSON.parse(cachedData) as LicenseCheckResponse)?.status;
    }

    let signatureToken = this.configService.get("api.signatureToken");
    if (!signatureToken) {
      const deployment = await this.deploymentsRepository.getDeployment();
      if (deployment?.signatureTokenEncrypted) {
        const encryptionKey = this.configService.get("api.encryptionKey");
        if (encryptionKey) {
          try {
            signatureToken = symmetricDecrypt(deployment.signatureTokenEncrypted, encryptionKey);
          } catch (e) {
            this.logger.error("Failed to decrypt signature token", e);
          }
        }
      }
    }

    const nonce = generateNonce();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      nonce,
      "x-cal-license-key": licenseKey,
    };

    if (signatureToken) {
      headers.signature = createSignature({}, nonce, signatureToken);
    } else {
      this.logger.warn("CAL_SIGNATURE_TOKEN needs to be set to check license.");
    }

    try {
      const response = await fetch(licenseKeyUrl, {
        headers,
        mode: "cors",
      });
      const data = (await response.json()) as LicenseCheckResponse;
      const cacheKey = getLicenseCacheKey(licenseKey);
      this.redisService.redis.set(cacheKey, JSON.stringify(data), "EX", CACHING_TIME);
      return data.status;
    } catch (e) {
      this.logger.error("Failed to check license", e);
      return false;
    }
  }
}
