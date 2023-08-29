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
    EMAIL_FROM_AI: process.env.EMAIL_FROM_AI,
    BACKEND_URL: process.env.BACKEND_URL,
    APP_ID: process.env.APP_ID,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },

  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    EMAIL_FROM_AI: z.string().email(),
    BACKEND_URL: z.string().url(),
    APP_ID: z.string().min(1),
    APP_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    OPENAI_API_KEY: z.string().min(1),
  },
});
