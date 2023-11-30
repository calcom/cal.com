import type { AppConfig } from "./type";

const loadConfig = (): AppConfig => {
  return {
    env: {
      type: (process.env.NODE_ENV as "production" | "development") ?? "development",
    },
    api: {
      port: Number(process.env.API_PORT ?? 5555),
    },
    db: {
      readUrl: process.env.DATABASE_READ_URL,
      writeUrl: process.env.DATABASE_WRITE_URL,
    },
  };
};

export default loadConfig;
