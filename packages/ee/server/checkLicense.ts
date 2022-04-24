import cache from "memory-cache";

import { CONSOLE_URL } from "@calcom/lib/constants";

async function checkLicense(license: string): Promise<boolean> {
  const url = `${CONSOLE_URL}/api/license?key=${license}`;
  const cachedResponse = cache.get(url);
  if (cachedResponse) {
    return cachedResponse;
  } else {
    try {
      const hours = 24;
      const response = await fetch(url);
      const data = await response.json();
      cache.put(url, data.valid, hours * 1000 * 60 * 60);
      return data.valid;
    } catch (error) {
      return false;
    }
  }
}

export default checkLicense;
