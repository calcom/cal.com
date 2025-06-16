import { z } from "zod";

import { isHostMatchingDomain } from "./isHostMatchingDomain";

export enum SystemTenant {
  DEFAULT = "__default",
  INSIGHTS = "__insights",
}

const tenantConfigSchema = z.record(
  z
    .object({
      activeOn: z.array(z.string()).optional(),
      connectionString: z.string(),
    })
    .strict()
);

type TenantConfig = z.infer<typeof tenantConfigSchema>;

const TENANT_ENV_MAP: TenantConfig = {
  [SystemTenant.DEFAULT]: {
    connectionString: process.env.DATABASE_URL || "",
  },
  ...(process.env.INSIGHTS_DATABASE_URL
    ? {
        [SystemTenant.INSIGHTS]: {
          connectionString: process.env.INSIGHTS_DATABASE_URL,
        },
      }
    : {}),
};

/*
 * Allows for multi-tenancy, format should be a JSON string like:
 * {
 *   "tenant1": {
 *     "activeOn": ["domain1.com", "domain2.com"],
 *     "connectionString": "postgresql://user:password@host:port/dbname"
 *   },
 *   ...
 * }
 */
if (process.env.TENANT_CONFIG) {
  let tenantConfig: TenantConfig;
  try {
    tenantConfig = tenantConfigSchema.parse(JSON.parse(process.env.TENANT_CONFIG));
  } catch (error: unknown) {
    throw new Error("Failed to parse TENANT_CONFIG environment variable.");
  }
  for (const [tenant, config] of Object.entries(tenantConfig)) {
    TENANT_ENV_MAP[tenant] = {
      activeOn: config.activeOn,
      connectionString: config.connectionString,
    };
  }
}

// tenant lists of all tenant keys outside of the system tenant
export const TENANT_LIST = Object.keys(TENANT_ENV_MAP).filter((tenant) => tenant !== SystemTenant.INSIGHTS);

export function getDatabaseUrl(tenant: string) {
  return TENANT_ENV_MAP[tenant]?.connectionString || TENANT_ENV_MAP[SystemTenant.DEFAULT].connectionString;
}

export const getTenantFromHost = (host: string): string => {
  for (const [tenant, tenantConfig] of Object.entries(TENANT_ENV_MAP)) {
    if (!tenantConfig.activeOn) continue;
    const domains = tenantConfig.activeOn.map((d) => d.trim()).filter(Boolean);
    if (domains.some((domain) => isHostMatchingDomain(host, domain))) {
      return tenant;
    }
  }
  return SystemTenant.DEFAULT;
};
