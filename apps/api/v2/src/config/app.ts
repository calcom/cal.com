import { getEnv } from "@/env";

import type { AppConfig } from "./type";

const loadConfig = (): AppConfig => {
  return {
    env: {
      type: getEnv("NODE_ENV", "development"),
    },
    api: {
      port: Number(process.env.API_PORT ?? 5555),
    },
    db: {
      readUrl: getEnv("DATABASE_READ_URL"),
      writeUrl: getEnv("DATABASE_WRITE_URL"),
    },
    next: {
      authSecret: getEnv("NEXTAUTH_SECRET"),
    },
  };
};

export default loadConfig;
