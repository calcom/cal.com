import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getPrismaFromHost, runWithTenants } from "./prismaStore";

type ApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>,
  prisma: PrismaClient
) => Promise<void | NextApiResponse<T>>;

/**
 * Higher-order function that wraps a Next.js API route handler with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";
 *
 * async function handler(req, res, prisma) {
 *   const users = await prisma.user.findMany();
 *   res.status(200).json({ users });
 * }
 *
 * export default withPrismaApiHandler(handler);
 * ```
 */
export function withPrismaApiHandler<T = any>(handler: ApiHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const host = req.headers.host || "";

    return runWithTenants(async () => {
      const prisma = getPrismaFromHost(host);
      return handler(req, res, prisma);
    });
  };
}
