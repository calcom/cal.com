// @ts-check
import { config as dotEnvConfig } from "dotenv";
import { z } from "zod";

import { transformValidator } from "./_transformValidator.mjs";

dotEnvConfig({ path: "../../.env" });
dotEnvConfig({ path: "../../packages/prisma/.env" });
dotEnvConfig({ path: "../../.env.appStore" });

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
  API_KEY_PREFIX: z.string().optional(),
  CALCOM_LICENSE_KEY: z.string().optional(),
  CALCOM_TELEMETRY_DISABLED: z.union([z.literal(""), z.literal("1")]).optional(),
  CALENDSO_ENCRYPTION_KEY: z.string(),
  CRON_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().url(),
  /** Transactional emails will come from this address */
  EMAIL_FROM: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn(
          "\x1b[33mwarn",
          "\x1b[0m",
          "EMAIL_FROM environment variable is not set, this may indicate mailing is currently disabled. Please refer to the .env.example file."
        );
      }
      return val;
    }),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_SERVER_PORT: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  NEXTAUTH_COOKIE_DOMAIN: z.string().optional(),
  NEXTAUTH_SECRET: z.string(),
  NEXTAUTH_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  PGSSLMODE: z.string().optional(),
  SAML_ADMINS: z.string().optional(),
  SAML_DATABASE_URL: z.union([z.literal(""), z.string().url()]).optional(),
  SEND_FEEDBACK_EMAIL: z.union([z.literal(""), z.string().email()]).optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_EMAIL: z.union([z.literal(""), z.string().email()]).optional(),
  STRIPE_FREE_PLAN_PRODUCT_ID: z.string().optional(),
  STRIPE_PREMIUM_PLAN_PRODUCT_ID: z.string().optional(),
  STRIPE_PRO_PLAN_PRODUCT_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_MESSAGING_SID: z.string().optional(),
  TWILIO_SID: z.string().optional(),
  TWILIO_TOKEN: z.string().optional(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
  NEXT_PUBLIC_CONSOLE_URL: z.string().url().optional(),
  NEXT_PUBLIC_EMBED_LIB_URL: z.string().url().optional(),
  NEXT_PUBLIC_HELPSCOUT_KEY: z.string().optional(),
  NEXT_PUBLIC_INTERCOM_APP_ID: z.string().optional(),
  /**
   * This is used so we can bypass emails in auth flows for E2E testing.
   * Set it to "1" if you need to run E2E tests locally
   **/
  NEXT_PUBLIC_IS_E2E: z.literal("1").optional(),
  NEXT_PUBLIC_LICENSE_CONSENT: z.literal("agree").optional(),
  NEXT_PUBLIC_STRIPE_FREE_PLAN_PRICE: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE: z.string().optional(),
  NEXT_PUBLIC_TEAM_IMPERSONATION: z.string().optional(),
  NEXT_PUBLIC_WEBAPP_URL: z.string().url().optional(),
  NEXT_PUBLIC_WEBSITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ZENDESK_KEY: z.string().optional(),
});

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const appStoreServerSchema = z.object({
  DAILY_API_KEY: z.string().optional(),
  DAILY_SCALE_PLAN: z.string().optional(),
  GIPHY_API_KEY: z.string().optional(),
  GOOGLE_API_CREDENTIALS: transformValidator(
    z.union([z.literal(""), z.string()]).optional(),
    (val) => (val ? JSON.parse(val) : undefined),
    z
      .object({
        web: z.object({
          client_secret: z.string(),
          client_id: z.string(),
          redirect_uris: z.string().array(),
        }),
      })
      .optional(),
    (val) => {
      if (!val) {
        console.warn(
          "\x1b[33mwarn",
          "\x1b[0m",
          '- Disabled \'Google Calendar\' integration. Reason: Invalid value for GOOGLE_API_CREDENTIALS environment variable. When set, this value needs to contain valid JSON like {"web":{"client_id":"<clid>","client_secret":"<secret>","redirect_uris":["<yourhost>/api/integrations/googlecalendar/callback>"]}. You can download this JSON from your OAuth Client @ https://console.cloud.google.com/apis/credentials.'
        );
        return undefined;
      }
      return JSON.parse(val);
    }
  ),
  GOOGLE_LOGIN_ENABLED: z.string().optional(),
  HUBSPOT_CLIENT_ID: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
  MS_GRAPH_CLIENT_ID: z.string().optional(),
  MS_GRAPH_CLIENT_SECRET: z.string().optional(),
  PAYMENT_FEE_FIXED: z.string().optional(),
  PAYMENT_FEE_PERCENTAGE: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  STRIPE_CLIENT_ID: z.string().optional(),
  STRIPE_PRIVATE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TANDEM_BASE_URL: z.string().optional(),
  TANDEM_CLIENT_ID: z.string().optional(),
  TANDEM_CLIENT_SECRET: z.string().optional(),
  VITAL_API_KEY: z.string().optional(),
  VITAL_DEVELOPMENT_MODE: z.string().optional(),
  VITAL_REGION: z.string().optional(),
  VITAL_WEBHOOK_SECRET: z.string().optional(),
  ZAPIER_INVITE_LINK: z.string().optional(),
  ZOOM_CLIENT_ID: z.string().optional(),
  ZOOM_CLIENT_SECRET: z.string().optional(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const appStoreClientSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string().optional(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof appStoreClientSchema>]: z.infer<typeof appStoreClientSchema>[k] | undefined }}
 */
export const appStoreClientEnv = {
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
};

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnv = {
  NEXT_PUBLIC_CONSOLE_URL: process.env.NEXT_PUBLIC_CONSOLE_URL,
  NEXT_PUBLIC_EMBED_LIB_URL: process.env.NEXT_PUBLIC_EMBED_LIB_URL,
  NEXT_PUBLIC_HELPSCOUT_KEY: process.env.NEXT_PUBLIC_HELPSCOUT_KEY,
  NEXT_PUBLIC_INTERCOM_APP_ID: process.env.NEXT_PUBLIC_INTERCOM_APP_ID,
  NEXT_PUBLIC_IS_E2E: process.env.NEXT_PUBLIC_IS_E2E,
  NEXT_PUBLIC_LICENSE_CONSENT: process.env.NEXT_PUBLIC_LICENSE_CONSENT,
  NEXT_PUBLIC_STRIPE_FREE_PLAN_PRICE: process.env.NEXT_PUBLIC_STRIPE_FREE_PLAN_PRICE,
  NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE,
  NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE: process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE,
  NEXT_PUBLIC_TEAM_IMPERSONATION: process.env.NEXT_PUBLIC_TEAM_IMPERSONATION,
  NEXT_PUBLIC_WEBAPP_URL: process.env.NEXT_PUBLIC_WEBAPP_URL,
  NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
  NEXT_PUBLIC_ZENDESK_KEY: process.env.NEXT_PUBLIC_ZENDESK_KEY,
  ...appStoreClientEnv,
};
