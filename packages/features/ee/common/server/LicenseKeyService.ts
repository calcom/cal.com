import * as cache from "memory-cache";

import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { getDeploymentKey } from "../../deployment/lib/getDeploymentKey";
import { generateNonce, createSignature } from "./private-api-utils";

export enum UsageEvent {
  BOOKING = "booking",
  USER = "user",
}

class LicenseKeyService {
  private readonly baseUrl = CALCOM_PRIVATE_API_ROUTE;
  private readonly licenseKey: string;
  public readonly CACHING_TIME = 86_400_000; // 24 hours in milliseconds

  // Private constructor to prevent direct instantiation
  private constructor(licenseKey: string) {
    this.baseUrl = CALCOM_PRIVATE_API_ROUTE;
    this.licenseKey = licenseKey;
  }

  // Static async factory method
  public static async create(): Promise<LicenseKeyService> {
    const licenseKey = await getDeploymentKey(prisma);
    return new LicenseKeyService(licenseKey);
  }

  private async fetcher({
    url,
    body,
    options = {},
  }: {
    url: string;
    body?: Record<string, unknown>;
    options?: RequestInit;
  }): Promise<Response> {
    const nonce = generateNonce();
    const signatureToken = process.env.CAL_SIGNATURE_TOKEN;
    if (!signatureToken) {
      throw new Error("CAL_SIGNATURE_TOKEN needs to be set");
    }
    const signature = createSignature(body || {}, nonce, signatureToken);

    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      nonce: nonce,
      signature: signature,
      "x-cal-license-key": this.licenseKey,
    };

    return await fetch(url, {
      ...options,
      headers: headers,
      body: JSON.stringify(body),
    });
  }

  async incrementUsage(usageEvent?: UsageEvent) {
    try {
      const response = await this.fetcher({
        url: `${this.baseUrl}/v1/license/usage/increment?event=${usageEvent ?? UsageEvent.BOOKING}`,
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
      const response = await this.fetcher({ url, options: { mode: "cors" } });
      const data = await response.json();
      cache.put(url, data.stauts, this.CACHING_TIME);
      return data.status;
    } catch (error) {
      console.error("Check license failed:", error);
      return false;
    }
  }
}

export default LicenseKeyService;
