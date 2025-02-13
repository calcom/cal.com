export type AppConfig = {
  env: {
    type: "production" | "development";
  };
  api: {
    port: number;
    path: string;
    url: string;
    keyPrefix: string;
    licenseKey: string;
    licenseKeyUrl: string;
  };
  db: {
    readUrl: string;
    writeUrl: string;
    redisUrl: string;
  };
  next: {
    authSecret: string;
  };
  stripe: {
    apiKey: string;
    webhookSecret: string;
    teamMonthlyPriceId: string;
    isTeamBillingEnabled: boolean;
  };
  app: {
    baseUrl: string;
  };
  e2e: boolean;
};
