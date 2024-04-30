import { logLevels } from "@/lib/logger";

export type Environment = {
  NODE_ENV: "development" | "production";
  API_PORT: string;
  API_URL: string;
  DATABASE_READ_URL: string;
  DATABASE_WRITE_URL: string;
  NEXTAUTH_SECRET: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  SENTRY_DSN: string;
  LOG_LEVEL: keyof typeof logLevels;
  REDIS_URL: string;
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  WEB_APP_URL: string;
};

export const getEnv = <K extends keyof Environment>(key: K, fallback?: Environment[K]): Environment[K] => {
  const value = process.env[key] as Environment[K] | undefined;

  if (!value) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`Missing environment variable: ${key}.`);
  }

  return value;
};
