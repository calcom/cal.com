declare namespace NodeJS {
  interface ProcessEnv {
    readonly CALENDSO_ENCRYPTION_KEY: string | undefined;
    readonly DATABASE_URL: string | undefined;
    readonly GOOGLE_API_CREDENTIALS: string | undefined;
    readonly BASE_URL: string | undefined;
    readonly NEXT_PUBLIC_BASE_URL: string | undefined;
    readonly NEXT_PUBLIC_APP_URL: string | undefined;
    readonly JWT_SECRET: string | undefined;
    readonly NEXT_PUBLIC_TELEMETRY_KEY: string | undefined;
    readonly MS_GRAPH_CLIENT_ID: string | undefined;
    readonly MS_GRAPH_CLIENT_SECRET: string | undefined;
    readonly ZOOM_CLIENT_ID: string | undefined;
    readonly ZOOM_CLIENT_SECRET: string | undefined;
    readonly EMAIL_FROM: string | undefined;
    readonly EMAIL_SERVER_HOST: string | undefined;
    readonly EMAIL_SERVER_PORT: string | undefined;
    readonly EMAIL_SERVER_USER: string | undefined;
    readonly EMAIL_SERVER_PASSWORD: string | undefined;
    readonly CRON_API_KEY: string | undefined;
    readonly NEXT_PUBLIC_STRIPE_PUBLIC_KEY: string | undefined;
    readonly STRIPE_PRIVATE_KEY: string | undefined;
    readonly STRIPE_CLIENT_ID: string | undefined;
    readonly STRIPE_WEBHOOK_SECRET: string | undefined;
    readonly PAYMENT_FEE_PERCENTAGE: number | undefined;
    readonly PAYMENT_FEE_FIXED: number | undefined;
    readonly CALENDSO_ENCRYPTION_KEY: string | undefined;
    readonly NEXT_PUBLIC_INTERCOM_APP_ID: string | undefined;
    readonly TANDEM_CLIENT_ID: string | undefined;
    readonly TANDEM_CLIENT_SECRET: string | undefined;
    readonly TANDEM_BASE_URL: string | undefined;
  }
}
