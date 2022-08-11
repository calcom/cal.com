import cache from "memory-cache";

import { CONSOLE_URL } from "@calcom/lib/constants";

const CACHING_TIME = 86400000; // 24 hours in milliseconds

async function checkLicense(license: string): Promise<boolean> {
  if (!!process.env.NEXT_PUBLIC_IS_E2E) return true;
  const url = `${CONSOLE_URL}/api/license?key=${license}`;
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
