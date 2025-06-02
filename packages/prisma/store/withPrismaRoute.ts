import type { NextRequest } from "next/server";

import { runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

type Params = {
  [param: string]: string | string[] | undefined;
};

type HandlerFn = (req: NextRequest, options: { params: Promise<Params> }) => Promise<Response>;

/**
 * Higher-order function that wraps a Next.js App Router route handler with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";
 *
 * async function handler(req: Request) {
 *   const users = await prisma.user.findMany();
 *
 *   return Response.json({ users });
 * }
 *
 * export const GET = withPrismaRoute(handler);
 * ```
 */
export function withPrismaRoute(handler: HandlerFn) {
  return async function wrappedHandler(
    req: NextRequest,
    options: { params: Promise<Params> }
  ): Promise<Response> {
    try {
      const host = req.headers.get("host") || "";
      const tenant = getTenantFromHost(host);
      return runWithTenants(tenant, async () => handler(req, options));
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
