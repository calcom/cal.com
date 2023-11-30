export type AppConfig = {
  env: {
    type: "production" | "development";
  };
  api: {
    port: number;
  };
  db: {
    readUrl: string;
    writeUrl: string;
  };
};
