import { middleware } from "../trpc";

/**
 * Middleware to handle webhook secrets
 * This middleware extracts the secret from the request body for webhook creation/editing
 * and adds it to the headers for improved security
 */
export const webhookSecretHeaderMiddleware = middleware(async (opts) => {
  const { ctx, next } = opts;
  const path = ctx.req?.url?.split("/").pop();
  const isWebhookMutation = path === "create" || path === "edit";

  if (isWebhookMutation && opts.rawInput && typeof opts.rawInput === "object") {
    const input = opts.rawInput as Record<string, unknown>;

    if ("secret" in input && typeof input.secret === "string") {
      ctx.req?.headers?.set("x-cal-webhook-secret", input.secret);
    }
  }

  return next();
});
