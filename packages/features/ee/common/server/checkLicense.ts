import cache from "memory-cache";
import { z } from "zod";

import { CONSOLE_URL } from "@calcom/lib/constants";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

export const schemaLicenseKey = z.string().uuid({
  message: "License key must follow UUID format: 8-4-4-4-12",
});

async function checkLicense(license: string): Promise<boolean> {
  if (!!process.env.NEXT_PUBLIC_IS_E2E) return true;
  if (!license) return false;
  const url = `${CONSOLE_URL}/api/license?key=${schemaLicenseKey.parse(license)}`;
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
