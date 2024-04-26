export type AppConfig = {
  env: {
    type: "production" | "development";
  };
  api: {
    port: number;
    path: string;
    url: string;
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
  };
  app: {
    baseUrl: string;
  };
};
