export enum Tenant {
  US = "us",
  EU = "eu",
  INSIGHTS = "insights",
}

export const tenantToDatabaseUrl = {
  [Tenant.US]: process.env.DATABASE_URL,
  [Tenant.EU]: process.env.DATABASE_URL_EU,
  [Tenant.INSIGHTS]: process.env.INSIGHTS_DATABASE_URL,
};

export const getTenantFromHost = (host: string) => {
  // TODO: Use an env variable for this
  const EU_DOMAIN = "cal.eu";
  // Check if host is exactly 'cal.eu' or ends with '.cal.eu'
  if (host === EU_DOMAIN || host.endsWith(`.${EU_DOMAIN}`)) {
    return Tenant.EU;
  }
  return Tenant.US;
};
