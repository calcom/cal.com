import * as cache from "memory-cache";

import {
  getDeploymentKey,
  getDeploymentSignatureToken,
} from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import type { IDeploymentRepository } from "@calcom/features/ee/deployment/repositories/IDeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

import { generateNonce, createSignature } from "./private-api-utils";

export enum UsageEvent {
  BOOKING = "booking",
  USER = "user",
}

export interface ILicenseKeyService {
  incrementUsage(usageEvent?: UsageEvent): Promise<any>;
  checkLicense(): Promise<boolean>;
}

class LicenseKeyService implements ILicenseKeyService {
  private readonly baseUrl = CALCOM_PRIVATE_API_ROUTE;
  private readonly licenseKey: string;
  private readonly signatureToken: string | null;
  public readonly CACHING_TIME = 86_400_000; // 24 hours in milliseconds

  // Private constructor to prevent direct instantiation
  private constructor(licenseKey: string, signatureToken: string | null) {
    this.baseUrl = CALCOM_PRIVATE_API_ROUTE;
    this.licenseKey = licenseKey;
    this.signatureToken = signatureToken;
  }

  // Static async factory method
  public static async create(deploymentRepo: IDeploymentRepository): Promise<ILicenseKeyService> {
    const licenseKey = await getDeploymentKey(deploymentRepo);
    const signatureToken = await getDeploymentSignatureToken(deploymentRepo);
    const useNoop = !licenseKey || process.env.NEXT_PUBLIC_IS_E2E === "1";
    return !useNoop ? new LicenseKeyService(licenseKey, signatureToken) : new NoopLicenseKeyService();
  }

  private async fetcher({
    url,
    body,
    licenseKey,
    options = {},
  }: {
    url: string;
    body?: Record<string, unknown>;
    licenseKey: string;
    options?: RequestInit;
  }): Promise<Response> {
    const nonce = generateNonce();

    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      nonce: nonce,
      "x-cal-license-key": licenseKey,
    } as Record<string, string>;

    if (!this.signatureToken) {
      logger.warn("CAL_SIGNATURE_TOKEN needs to be set to increment usage.");
    } else {
      const signature = createSignature(body || {}, nonce, this.signatureToken);
      headers["signature"] = signature;
    }

    return await fetch(url, {
      ...options,
      headers: headers,
      body: JSON.stringify(body),
      // In case of hang, abort the operation after 2 seconds
      signal: AbortSignal.timeout(2000),
    });
  }

  // Static method to validate a license key directly
  public static async validateLicenseKey(licenseKey: string): Promise<boolean> {
    /** We skip for E2E testing */
    if (process.env.NEXT_PUBLIC_IS_E2E === "1") return true;

    // Create a temporary instance to use instance methods
    const service = new LicenseKeyService(licenseKey, "");
    return service.checkLicense();
  }

  async incrementUsage(usageEvent?: UsageEvent) {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/license/usage/increment?event=${usageEvent ?? UsageEvent.BOOKING}`,
        licenseKey: this.licenseKey,
        options: {
          method: "POST",
          mode: "cors",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Incrementing usage failed:", error);
      throw error;
    }
  }

  async checkLicense(): Promise<boolean> {
    /** We skip for E2E testing */
    if (process.env.NEXT_PUBLIC_IS_E2E === "1") return true;
    /** We check first on env */
    const url = `${this.baseUrl}/v1/license/${this.licenseKey}`;
    const cachedResponse = cache.get(url);
    if (cachedResponse) return cachedResponse;
    try {
      const response = await this.fetcher({ url, licenseKey: this.licenseKey, options: { mode: "cors" } });
      const data = await response.json();
      cache.put(url, data.status, this.CACHING_TIME);
      return data.status;
    } catch (error) {
      console.error("Check license failed:", error);
      return false;
    }
  }
}

export class NoopLicenseKeyService implements ILicenseKeyService {
  async incrementUsage(_usageEvent?: UsageEvent): Promise<any> {
    // No operation
    return Promise.resolve();
  }

  async checkLicense(): Promise<boolean> {
    return Promise.resolve(process.env.NEXT_PUBLIC_IS_E2E === "1");
  }
}

export class LicenseKeySingleton {
  private static instance: ILicenseKeyService | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Private constructor to prevent direct instantiation
  private constructor() {}

  public static async getInstance(deploymentRepo: IDeploymentRepository): Promise<ILicenseKeyService> {
    if (!LicenseKeySingleton.instance) {
      LicenseKeySingleton.instance = await LicenseKeyService.create(deploymentRepo);
    }
    return LicenseKeySingleton.instance;
  }
}

export default LicenseKeyService;
