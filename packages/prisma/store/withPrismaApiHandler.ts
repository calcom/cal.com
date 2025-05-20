import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

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
 * import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";
 *
 * async function handler(req, res, prisma) {
 *   // Option 1: Use the injected prisma client
 *   // const users = await prisma.user.findMany();
 *
 *   // Option 2: Use getTenantAwarePrisma() anywhere in your code
 *   const prisma = getTenantAwarePrisma();
 *   const users = await prisma.user.findMany();
 *
 *   res.status(200).json({ users });
 * }
 *
 * export default withPrismaApiHandler(handler);
 * ```
 */
export function withPrismaApiHandler<T = any>(handler: ApiHandler<T>) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const host = req.headers.host || "";
    const tenant = getTenantFromHost(host);

    return runWithTenants(tenant, async () => {
      const prisma = getPrisma(tenant);
      return handler(req, res, prisma);
    });
  };
}
