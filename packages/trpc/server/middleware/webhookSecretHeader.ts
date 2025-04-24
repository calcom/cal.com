import { middleware } from "../trpc";

/**
 * Middleware to handle webhook secrets
 * This middleware extracts the secret from the request body for webhook creation/editing
 * and adds it to the headers for improved security
 */
export const webhookSecretHeaderMiddleware = middleware(async ({ ctx, next, meta, input }) => {
  const path = ctx.req?.url?.split("/").pop();
  const isWebhookMutation = path === "create" || path === "edit";

  if (isWebhookMutation && input && typeof input === "object") {
    const webhookInput = input as { secret?: string };

    if (webhookInput.secret && typeof webhookInput.secret === "string") {
      if (ctx.req?.headers) {
        ctx.req.headers["x-cal-webhook-secret"] = webhookInput.secret;
      }
    }
  }

  return next();
});
