import cache from "memory-cache";
import { z } from "zod";

import { CONSOLE_URL } from "@calcom/lib/constants";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

const schemaLicenseKey = z
  .string()
  // .uuid() exists but I'd to fix the situation where the CALCOM_LICENSE_KEY is wrapped in quotes
  .regex(/^\"?[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\"?$/, {
    message: "License key must follow UUID format: 8-4-4-4-12",
  })
  .transform((v) => {
    // Remove the double quotes from the license key, as they 404 the fetch.
    return v != null && v.length >= 2 && v.charAt(0) == '"' && v.charAt(v.length - 1) == '"'
      ? v.substring(1, v.length - 1)
      : v;
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
