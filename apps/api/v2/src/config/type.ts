export type AppConfig = {
  env: {
    type: "production" | "development";
    redisUrl: string;
  };
  api: {
    port: number;
    defaultRateLimit: number;
  };
  db: {
    readUrl: string;
    writeUrl: string;
  };
};
