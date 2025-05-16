export enum Tenant {
  US = "us",
  EU = "eu",
}

export const tenantToDatabaseUrl = {
  [Tenant.US]: process.env.DATABASE_URL,
  [Tenant.EU]: process.env.DATABASE_URL_EU,
};

export const getTenantFromHost = (host: string) => {
  if (host.startsWith("app.cal.eu")) {
    return Tenant.EU;
  }
  return Tenant.US;
};
