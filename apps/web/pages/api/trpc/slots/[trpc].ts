/**
 * This file contains tRPC's HTTP response handler
 */
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createNextApiHandler } from "@calcom/trpc/server/adapters/next";
import { createContext as createTRPCContext } from "@calcom/trpc/server/createContext";
import { slotsRouter } from "@calcom/trpc/server/routers/viewer/slots";

export default createNextApiHandler({
  /**
   * Deploy slotsRouter separately
   */
  router: slotsRouter,

  /**
   * @link https://trpc.io/docs/context
   */
  createContext: (opts) => {
    const sessionGetter = () => getServerSession(opts);
    return createTRPCContext(opts, sessionGetter);
  },

  /**
   * @link https://trpc.io/docs/caching#api-response-caching
   */
  responseMeta({ ctx, paths, type, errors }) {
    // checking that no procedures errored
    const allOk = errors.length === 0;
    // checking we're doing a query request
    const isQuery = type === "query";

    // We cannot set headers on SSG queries
    if (!ctx?.res) return {};

    const defaultHeaders: Record<"headers", Record<string, string>> = {
      headers: {},
    };

    const timezone = z.string().safeParse(ctx.req?.headers["x-vercel-ip-timezone"]);
    if (timezone.success) defaultHeaders.headers["x-cal-timezone"] = timezone.data;

    // We need all these conditions to be true to set cache headers
    if (!(allOk && isQuery)) return defaultHeaders;

    // Revalidation time here should be 1 second, per https://github.com/calcom/cal.com/pull/6823#issuecomment-1423215321
    defaultHeaders.headers["cache-control"] = `no-cache`; // FIXME
    
    return defaultHeaders;
  },
});
