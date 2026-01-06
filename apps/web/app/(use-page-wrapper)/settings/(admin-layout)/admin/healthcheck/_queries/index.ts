import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LicenseKeyService from "@calcom/features/ee/common/server/LicenseKeyService";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AppStatus } from "../_repository";
import { healthcheckRepository } from "../_repository";

const HEALTHCHECK_CACHE_TTL = 60; // 1 minute cache for health checks

type HealthCheckData = {
  apps: {
    installed: AppStatus[];
    total: number;
  };
  license: {
    hasEnvKey: boolean;
    hasDbKey: boolean;
    isValid: boolean;
  };
  email: {
    hasEmailFrom: boolean;
    hasSendgridApiKey: boolean;
    hasSmtpConfig: boolean;
    provider: "sendgrid" | "smtp" | "none";
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

function getEmailConfigStatus(): HealthCheckData["email"] {
  const hasEmailFrom = !!process.env.EMAIL_FROM;
  const hasSendgridApiKey = !!process.env.SENDGRID_API_KEY;
  const hasSmtpHost = !!process.env.EMAIL_SERVER_HOST;
  const hasSmtpPort = !!process.env.EMAIL_SERVER_PORT;
  const hasSmtpConfig = hasSmtpHost && hasSmtpPort;

  let provider: "sendgrid" | "smtp" | "none" = "none";
  if (hasSendgridApiKey) {
    provider = "sendgrid";
  } else if (hasSmtpConfig) {
    provider = "smtp";
  }

  return {
    hasEmailFrom,
    hasSendgridApiKey,
    hasSmtpConfig,
    provider,
  };
}

function getRedisConfigStatus(): HealthCheckData["redis"] {
  return {
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function fetchHealthCheckData(): Promise<HealthCheckData> {
  const [apps, dbLicenseKey, database] = await Promise.all([
    healthcheckRepository.listApps(),
    healthcheckRepository.getDeploymentLicenseKey(),
    healthcheckRepository.ping(),
  ]);

  const hasEnvKey = !!process.env.CALCOM_LICENSE_KEY;
  const hasDbKey = !!dbLicenseKey;

  // Validate license key using LicenseKeyService
  let isValid = false;
  if (hasEnvKey || hasDbKey) {
    try {
      const deploymentRepo = healthcheckRepository.getDeploymentRepository();
      const licenseService = await LicenseKeyService.create(deploymentRepo);
      isValid = await licenseService.checkLicense();
    } catch {
      // License validation failed, keep isValid as false
      isValid = false;
    }
  }

  const email = getEmailConfigStatus();
  const redis = getRedisConfigStatus();

  return {
    apps: {
      installed: apps,
      total: apps.length,
    },
    license: {
      hasEnvKey,
      hasDbKey,
      isValid,
    },
    email,
    redis,
    database,
  };
}

const cachedFetchHealthCheckData: () => Promise<HealthCheckData> = unstable_cache(
  fetchHealthCheckData,
  ["admin-healthcheck"],
  {
    revalidate: HEALTHCHECK_CACHE_TTL,
    tags: ["admin-healthcheck"],
  }
);

/**
 * Get health check data for admin users only.
 * This function verifies admin role before returning cached health check data.
 */
async function getHealthCheckData(): Promise<HealthCheckData> {
  // Verify admin role - defense in depth (layout also checks)
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userRole = session?.user?.role;

  if (userRole !== UserPermissionRole.ADMIN) {
    redirect("/settings/my-account/profile");
  }

  return cachedFetchHealthCheckData();
}

export type { AppStatus, HealthCheckData };
export { getHealthCheckData };
