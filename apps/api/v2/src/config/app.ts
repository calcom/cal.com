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
    },
    db: {
      readUrl: getEnv("DATABASE_READ_URL"),
      writeUrl: getEnv("DATABASE_WRITE_URL"),
      redisUrl: getEnv("REDIS_URL"),
    },
    next: {
      authSecret: getEnv("NEXTAUTH_SECRET"),
    },
  };
};

export default loadConfig;
