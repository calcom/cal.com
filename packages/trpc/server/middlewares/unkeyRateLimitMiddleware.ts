import { Ratelimit } from "@unkey/ratelimit";

import { TRPCError } from "@trpc/server";

// Your env vars
import { middleware } from "../trpc";

const getClientIp = (ctx: Context) => {
  // 1. X-Forwarded-For (most reliable, handles multiple proxies)
  const forwarded = ctx.req.headers["x-forwarded-for"] as string | string[] | undefined;
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return `ip:${ips.split(",")[0].trim()}`; // First IP = client
  }

  // 2. X-Real-IP (some CDNs like single IP)
  const realIp = ctx.req.headers["x-real-ip"] as string | undefined;
  if (realIp) return `ip:${realIp}`;

  // 3. Fallback: direct connection (local dev)
  return `ip:${ctx.req.socket.remoteAddress || "unknown"}`;
};


// NOTE: Created a new middleware for this route as the one used earlier is used in too many places and requires the whole setup to be complete on unkey (otherwise it will block all requests).
export const createRateLimitMiddleware = (namespace: string, limit: number, duration: number | Duration) => {
  return middleware(async ({ ctx, next, path }) => {
    const { CALID_UNKEY_ROOT_KEY } = process.env;
    if (!CALID_UNKEY_ROOT_KEY) {
      return next();
    }
    const unkey = new Ratelimit({
      rootKey: CALID_UNKEY_ROOT_KEY,
      namespace: `${namespace}`, // Unique per route: "api:posts.create"
      limit,
      duration,
      async: true,
    });

    const identifier = ctx.session?.user.id ? `user:${ctx.session.user.id}` : getClientIp(ctx);
    const data = await unkey.limit(identifier);

    console.log("UNKEY IDENTIFIER:", identifier, "PATH:", path, "DATA:", data);
    if (!data.success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests made. Please try again after sometime",
        cause: { reset: unkey.reset, remaining: unkey.remaining },
      });
    }

    return next({ ctx: { ...ctx, rateLimit: unkey } }); // Pass for headers if needed
  });
};
