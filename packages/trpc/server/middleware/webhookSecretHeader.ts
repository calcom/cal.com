import { middleware } from "../trpc";

/**
 * Middleware to handle webhook secrets
 * This middleware extracts the secret from the request body for webhook creation/editing
 * and adds it to the headers for improved security
 */
export const webhookSecretHeaderMiddleware = middleware(async ({ ctx, next, rawInput }) => {
  const path = ctx.req?.url?.split("/").pop();
  const isWebhookMutation = path === "create" || path === "edit";

  if (isWebhookMutation && rawInput && typeof rawInput === "object" && "secret" in rawInput) {
    const secret = (rawInput as { secret?: string | null }).secret;

    if (secret) {
      ctx.req?.headers?.set("x-cal-webhook-secret", secret);
    }
  }

  return next();
});
