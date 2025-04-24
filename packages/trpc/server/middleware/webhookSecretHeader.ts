import { middleware } from "../trpc";

/**
 * Middleware to handle webhook secrets
 * This middleware extracts the secret from the request body for webhook creation/editing
 * and adds it to the headers for improved security
 */
export const webhookSecretHeaderMiddleware = middleware(({ ctx, next, rawInput }) => {
  const path = ctx.req?.url?.split("/").pop();
  const isWebhookMutation = path === "create" || path === "edit";

  if (isWebhookMutation && rawInput && typeof rawInput === "object") {
    const webhookInput = rawInput as { secret?: string };

    if (webhookInput.secret && typeof webhookInput.secret === "string") {
      if (ctx.req?.headers) {
        ctx.req.headers["x-cal-webhook-secret"] = webhookInput.secret;
      }
    }
  }

  return next();
});
