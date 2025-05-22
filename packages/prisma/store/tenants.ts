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
  if (host.startsWith("app.cal.local")) {
    return Tenant.EU;
  }
  return Tenant.US;
};
