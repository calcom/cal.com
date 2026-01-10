import { getEnv } from "@/env";

import type { AppConfig } from "./type";

const loadConfig = (): AppConfig => {
  return {
    env: {
      type: getEnv("NODE_ENV", "development"),
    },
    api: {
      port: Number(getEnv("API_PORT", "5555")),
      path: getEnv("API_URL", "http://localhost"),
      url: `${getEnv("API_URL", "http://localhost")}${
        process.env.API_PORT && getEnv("NODE_ENV", "development") === "development"
          ? `:${Number(getEnv("API_PORT", "5555"))}`
          : ""
      }/v2`,
      keyPrefix: getEnv("API_KEY_PREFIX", "cal_"),
      licenseKey: getEnv("CALCOM_LICENSE_KEY", ""),
      licenseKeyUrl: getEnv("GET_LICENSE_KEY_URL", "https://console.cal.com/api/license"),
    },
    db: {
      readUrl: getEnv("DATABASE_READ_URL"),
      writeUrl: getEnv("DATABASE_WRITE_URL"),
      readPoolMax: getEnv("DATABASE_READ_POOL_MAX", 9),
      writePoolMax: getEnv("DATABASE_WRITE_POOL_MAX", 7),
      workerReadPoolMax: getEnv("DATABASE_READ_WORKER_POOL_MAX", 4),
      workerWritePoolMax: getEnv("DATABASE_WRITE_WORKER_POOL_MAX", 6),
      redisUrl: getEnv("REDIS_URL"),
    },
    next: {
      authSecret: getEnv("NEXTAUTH_SECRET"),
    },
    stripe: {
      apiKey: getEnv("STRIPE_API_KEY"),
      webhookSecret: getEnv("STRIPE_WEBHOOK_SECRET"),
      teamMonthlyPriceId: getEnv("STRIPE_TEAM_MONTHLY_PRICE_ID", "set-team-monthly-price-in-your-env"),
      isTeamBillingEnabled: getEnv("IS_TEAM_BILLING_ENABLED", true),
    },
    app: {
      baseUrl: getEnv("WEB_APP_URL", "https://app.cal.com"),
    },
    e2e: getEnv("IS_E2E", "false") === "true" ? true : false,
  };
};

export default loadConfig;
