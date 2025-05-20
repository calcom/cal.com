import type { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

type HandlerFn = (req: NextRequest, prisma: PrismaClient) => Promise<Response>;

/**
 * Higher-order function that wraps a Next.js App Router route handler with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";
 * import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";
 *
 * async function handler(req: Request, prisma: PrismaClient) {
 *   // Option 1: Use the injected prisma client
 *   // const users = await prisma.user.findMany();
 *
 *   // Option 2: Use getTenantAwarePrisma() anywhere in your code
 *   const prisma = getTenantAwarePrisma();
 *   const users = await prisma.user.findMany();
 *
 *   return Response.json({ users });
 * }
 *
 * export const GET = withPrismaRoute(handler);
 * ```
 */
export function withPrismaRoute(handler: HandlerFn) {
  return async function wrappedHandler(req: NextRequest): Promise<Response> {
    try {
      const host = req.headers.get("host") || "";
      const tenant = getTenantFromHost(host);

      return runWithTenants(tenant, async () => {
        const prisma = getPrisma(tenant);
        return await handler(req, prisma);
      });
    } catch (error) {
      console.error(`[withPrismaRoute] Error:`, error);
      return new Response(
        JSON.stringify({
          error: "Database connection error",
          message: error instanceof Error ? error.message : "Unknown error",
          tenant: req.headers.get("host") || "unknown",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}
