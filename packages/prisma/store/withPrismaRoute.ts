import type { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

type HandlerFn = (req: NextRequest, prisma: PrismaClient) => Promise<Response>;

export function withPrismaRoute(handler: HandlerFn) {
  return async function wrappedHandler(req: NextRequest): Promise<Response> {
    const host = req.headers.get("host") || "";
    const tenant = getTenantFromHost(host);

    return runWithTenants(tenant, async () => {
      const prisma = getPrisma(tenant);
      return await handler(req, prisma);
    });
  };
}
