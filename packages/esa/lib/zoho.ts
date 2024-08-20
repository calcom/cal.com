import type { ZohoConfig } from "@deep-consulting-solutions/zoho-utils";
import { ClientLibCM } from "@deep-consulting-solutions/zoho-utils";

import { redis } from "./redis";

let zohoClientInstance: ClientLibCM | null = null;

export const initZohoClient = (): void => {
  const zohoConfig: ZohoConfig = {
    accountsUrl: process.env.ZOHO_ACCOUNTS_BASE_URL || "",
    clientID: process.env.ZOHO_CLIENT_ID || "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
    crm: {
      apiUrl: `${process.env.ZOHO_CRM_BASE_URL}/v2`,
      apiUrlV2_1: `${process.env.ZOHO_CRM_BASE_URL}/v2`,
      apiUrlV3: `${process.env.ZOHO_CRM_BASE_URL}/v3`,
      apiUrlV5: `${process.env.ZOHO_CRM_BASE_URL}/v5`,
    },
  };
  //
  // const redisPort = Number(process.env.REDIS_PORT) || 6379;
  // const redisHost = process.env.REDIS_HOST || "127.0.0.1";
  //
  // redisClient = new Redis(redisPort, redisHost);
  zohoClientInstance = new ClientLibCM(process.env.MANAGER_URL || "", redis, zohoConfig);
};

export const zohoClient = (): ClientLibCM => {
  if (!zohoClientInstance) {
    initZohoClient();

    if (!zohoClientInstance) {
      throw new Error("zohoClient lib initialization failed");
    }
  }

  return zohoClientInstance;
};
