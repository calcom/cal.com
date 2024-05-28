import cache from "memory-cache";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";

import { prisma } from "../../../../prisma";
import { getDeploymentKey } from "../../deployment/lib/getDeploymentKey";

class LicenseKeyService {
  private readonly baseUrl: string;
  private readonly licenseKey: string;
  private readonly CACHING_TIME = 86_400_000; // 24 hours in milliseconds

  // Private constructor to prevent direct instantiation
  private constructor(baseUrl: string, licenseKey: string) {
    this.baseUrl = baseUrl;
    this.licenseKey = licenseKey;
  }

  // Static async factory method
  public static async create(): Promise<LicenseKeyService> {
    const baseUrl = process.env.CALCOM_PRIVATE_API_ROUTE;
    if (!baseUrl && !IS_SELF_HOSTED) {
      throw new Error("CALCOM_PRIVATE_API_ROUTE is not set");
    }

    const licenseKey = await getDeploymentKey(prisma);

    return new LicenseKeyService(baseUrl, licenseKey);
  }

  async incrementUsage() {
    try {
      const response = await fetch(`${this.baseUrl}/usage/increment/${key}`, {
        method: "POST",
        mode: "cors",
      });
      return await response.json();
    } catch (error) {
      console.error("Error incrementing usage:", error);
      throw error;
    }
  }

  async checkLicense(): Promise<boolean> {
    /** We skip for E2E testing */
    if (!!process.env.NEXT_PUBLIC_IS_E2E) return true;
    /** We check first on env */
    const url = `${process.env.CALCOM_PRIVATE_API_ROUTE}/v1/license/${this.licenseKey}`;
    const cachedResponse = cache.get(url);
    if (cachedResponse) {
      return cachedResponse;
    } else {
      try {
        const response = await fetch(url, { mode: "cors" });
        const data = await response.json();
        cache.put(url, data.valid, this.CACHING_TIME);
        return data.valid;
      } catch (error) {
        return false;
      }
    }
  }
}

export default LicenseKeyService;
