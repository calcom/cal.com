import { Client, Config } from "@adyen/api-library";

import { IS_LIVE } from "../constants";

export const createAdyenClient = (apiKey: string) => {
  const config = new Config({ apiKey, environment: IS_LIVE ? "LIVE" : "TEST" });
  const client = new Client({ config });
  return client;
};
