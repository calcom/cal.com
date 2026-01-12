import process from "node:process";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LicenseKeyService from "@calcom/features/ee/common/server/LicenseKeyService";
import { CALCOM_PRIVATE_API_ROUTE, WEBAPP_URL } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AppStatus } from "../_repository";
import { healthcheckRepository } from "../_repository";

const HEALTHCHECK_CACHE_TTL = 60; // 1 minute cache for health checks
const API_HEALTH_TIMEOUT_MS = 5000; // 5 second timeout for API health checks

type ApiHealthStatus = {
  status: "ok" | "error" | "unreachable";
  responseTime?: number;
  error?: string;
};

type LicenseStatus = {
  hasEnvKey: boolean;
  hasDbKey: boolean;
  isValid: boolean;
  serverReachable: boolean;
  serverUrl: string;
  error?: string;
};

type HealthCheckData = {
  apps: {
    installed: AppStatus[];
    total: number;
  };
  license: LicenseStatus;
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
  apiV1: ApiHealthStatus;
  apiV2: ApiHealthStatus;
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

async function checkApiHealth(url: string): Promise<ApiHealthStatus> {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(API_HEALTH_TIMEOUT_MS),
    });
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return { status: "ok", responseTime };
    }
    return {
      status: "error",
      responseTime,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        return { status: "unreachable", responseTime, error: "Request timed out" };
      }
      return { status: "unreachable", responseTime, error: error.message };
    }
    return { status: "unreachable", responseTime, error: "Unknown error" };
  }
}

async function checkLicenseServerReachability(): Promise<boolean> {
  try {
    const healthUrl = `${CALCOM_PRIVATE_API_ROUTE}/health`;
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(API_HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getLicenseStatus(dbLicenseKey: string | null): Promise<LicenseStatus> {
  const hasEnvKey = !!process.env.CALCOM_LICENSE_KEY;
  const hasDbKey = !!dbLicenseKey;
  const serverUrl = CALCOM_PRIVATE_API_ROUTE;

  // If no license key configured, skip validation
  if (!hasEnvKey && !hasDbKey) {
    return {
      hasEnvKey,
      hasDbKey,
      isValid: false,
      serverReachable: true, // Not relevant when no key
      serverUrl,
    };
  }

  // First check if license server is reachable
  const serverReachable = await checkLicenseServerReachability();

  if (!serverReachable) {
    return {
      hasEnvKey,
      hasDbKey,
      isValid: false,
      serverReachable: false,
      serverUrl,
      error: "Cannot reach license server. A firewall may be blocking the request.",
    };
  }

  // Server is reachable, now validate the license
  let isValid = false;
  let error: string | undefined;
  try {
    const deploymentRepo = healthcheckRepository.getDeploymentRepository();
    const licenseService = await LicenseKeyService.create(deploymentRepo);
    isValid = await licenseService.checkLicense();
  } catch (e) {
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = "License validation failed";
    }
  }

  return {
    hasEnvKey,
    hasDbKey,
    isValid,
    serverReachable: true,
    serverUrl,
    error,
  };
}

function getApiV2Url(): string {
  if (process.env.NEXT_PUBLIC_API_V2_URL) {
    return `${process.env.NEXT_PUBLIC_API_V2_URL}/health`;
  }
  return `${WEBAPP_URL}/api/v2/health`;
}

async function fetchHealthCheckData(): Promise<HealthCheckData> {
  // Build API URLs based on WEBAPP_URL
  const apiV1Url = `${WEBAPP_URL}/api`;
  const apiV2Url = getApiV2Url();

  const [apps, dbLicenseKey, database, apiV1, apiV2] = await Promise.all([
    healthcheckRepository.listApps(),
    healthcheckRepository.getDeploymentLicenseKey(),
    healthcheckRepository.ping(),
    checkApiHealth(apiV1Url),
    checkApiHealth(apiV2Url),
  ]);

  const license = await getLicenseStatus(dbLicenseKey);
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
    apiV1,
    apiV2,
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
