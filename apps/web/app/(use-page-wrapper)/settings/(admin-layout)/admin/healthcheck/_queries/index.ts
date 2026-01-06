import { unstable_cache } from "next/cache";
import process from "node:process";

import prisma from "@calcom/prisma";

const HEALTHCHECK_CACHE_TTL = 60; // 1 minute cache for health checks

type AppStatus = {
  slug: string;
  dirName: string;
  enabled: boolean;
  categories: string[];
};

type HealthCheckData = {
  apps: {
    installed: AppStatus[];
    total: number;
  };
  license: {
    hasEnvKey: boolean;
    hasDbKey: boolean;
  };
  email: {
    hasEmailFrom: boolean;
    hasSendgridApiKey: boolean;
  };
  redis: {
    hasUpstashUrl: boolean;
    hasUpstashToken: boolean;
  };
  database: {
    connected: boolean;
    error?: string;
  };
};

async function getInstalledApps(): Promise<AppStatus[]> {
  const apps = await prisma.app.findMany({
    select: {
      slug: true,
      dirName: true,
      enabled: true,
      categories: true,
    },
    orderBy: {
      slug: "asc",
    },
  });

  return apps;
}

async function getLicenseKeyStatus(): Promise<{ hasEnvKey: boolean; hasDbKey: boolean }> {
  const hasEnvKey = !!process.env.CALCOM_LICENSE_KEY;

  let hasDbKey = false;
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: 1 },
      select: { licenseKey: true },
    });
    hasDbKey = !!deployment?.licenseKey;
  } catch {
    // Deployment table might not exist in some setups
    hasDbKey = false;
  }

  return { hasEnvKey, hasDbKey };
}

function getEmailConfigStatus(): { hasEmailFrom: boolean; hasSendgridApiKey: boolean } {
  return {
    hasEmailFrom: !!process.env.EMAIL_FROM,
    hasSendgridApiKey: !!process.env.SENDGRID_API_KEY,
  };
}

function getRedisConfigStatus(): { hasUpstashUrl: boolean; hasUpstashToken: boolean } {
  return {
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function getDatabaseStatus(): Promise<{ connected: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    let errorMessage = "Unknown database error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      connected: false,
      error: errorMessage,
    };
  }
}

async function fetchHealthCheckData(): Promise<HealthCheckData> {
  const [apps, license, database] = await Promise.all([
    getInstalledApps(),
    getLicenseKeyStatus(),
    getDatabaseStatus(),
  ]);

  const email = getEmailConfigStatus();
  const redis = getRedisConfigStatus();

  return {
    apps: {
      installed: apps,
      total: apps.length,
    },
    license,
    email,
    redis,
    database,
  };
}

const getHealthCheckData: () => Promise<HealthCheckData> = unstable_cache(
  fetchHealthCheckData,
  ["admin-healthcheck"],
  {
    revalidate: HEALTHCHECK_CACHE_TTL,
    tags: ["admin-healthcheck"],
  }
);

export type { AppStatus, HealthCheckData };
export { getHealthCheckData };
