import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    APP_ID: process.env.APP_ID,
    APP_URL: process.env.APP_URL,
    SENDER_DOMAIN: process.env.SENDER_DOMAIN,
    PARSE_KEY: process.env.PARSE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  },

  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BACKEND_URL: z.string().url(),
    FRONTEND_URL: z.string().url(),
    APP_ID: z.string().min(1),
    APP_URL: z.string().url(),
    SENDER_DOMAIN: z.string().min(1),
    PARSE_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "test", "production"]),
    OPENAI_API_KEY: z.string().min(1),
    SENDGRID_API_KEY: z.string().min(1),
    DATABASE_URL: z.string().url(),
  },
});
