import cache from "memory-cache";
import { z } from "zod";

import type { PrismaClient } from "@calcom/prisma";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

const schemaLicenseKey = z.string();

async function checkLicense(
  /** The prisma client to use (necessary for public API to handle custom prisma instances) */
  prisma: PrismaClient
): Promise<boolean> {
  /** We skip for E2E testing */
  if (!!process.env.NEXT_PUBLIC_IS_E2E) return true;
  /** We check first on env */
  let licenseKey = process.env.CALCOM_LICENSE_KEY;
  if (!licenseKey) {
    /** We try to check on DB only if env is undefined */
    const deployment = await prisma.deployment.findFirst({ where: { id: 1 } });
    licenseKey = deployment?.licenseKey ?? undefined;
  }
  if (!licenseKey) return false;

  /**
   * The console URL for this will be used for any user that has not upgraded to latest as it proxies
   * to our private-api
   * const url = `${CONSOLE_URL}/api/license?key=${schemaLicenseKey.parse(licenseKey)}`;
   */
  const url = `${process.env.CALCOM_PRIVATE_API_ROUTE}/api/license/${schemaLicenseKey.parse(licenseKey)}`;
  const cachedResponse = cache.get(url);
  if (cachedResponse) {
    return cachedResponse;
  } else {
    try {
      const response = await fetch(url, { mode: "cors" });
      const data = await response.json();
      cache.put(url, data.valid, CACHING_TIME);
      return data.valid;
    } catch (error) {
      return false;
    }
  }
}

export default checkLicense;
