import type { NextApiRequest, NextApiResponse } from "next";

import { runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

type ApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => Promise<void | NextApiResponse<T>>;

/**
 * Higher-order function that wraps a Next.js API route handler with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";
 *
 * async function handler(req, res) {
 *   res.status(200).json({ users });
 * }
 *
 * export default withPrismaApiHandler(handler);
 * ```
 */
export function withPrismaApiHandler<T = any>(handler: ApiHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    try {
      const host = req.headers.host || "";
      const tenant = getTenantFromHost(host);

      return runWithTenants(tenant, async () => handler(req, res));
    } catch (error) {
      console.error(`[withPrismaApiHandler] Error:`, error);
      return res.status(500).json({
        error: "Database connection error",
        message: error instanceof Error ? error.message : "Unknown error",
        tenant: req.headers.host || "unknown",
      } as unknown as T);
    }
  };
}
