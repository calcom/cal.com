export enum Tenant {
  US = "us",
  EU = "eu",
  INSIGHTS = "insights",
}

const TENANT_ENV_MAP: Partial<Record<Tenant, string>> = {};
if (process.env.TENANT_DOMAINS_EU) {
  TENANT_ENV_MAP[Tenant.EU] = process.env.TENANT_DOMAINS_EU;
}

export const tenantToDatabaseUrl: Record<Tenant, string | undefined> = {
  [Tenant.US]: process.env.DATABASE_URL,
  [Tenant.EU]: process.env.DATABASE_URL_EU,
  [Tenant.INSIGHTS]: process.env.INSIGHTS_DATABASE_URL,
};

export const getTenantFromHost = (host: string) => {
  for (const [tenant, domainList] of Object.entries(TENANT_ENV_MAP)) {
    const domains = domainList
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return tenant as Tenant;
    }
  }
  return Tenant.US; // Default to US if no match found
};
