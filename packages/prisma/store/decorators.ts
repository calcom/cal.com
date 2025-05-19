import type { NextApiRequest } from "next";
import type { NextRequest } from "next/server";

import { getPrismaFromHost, runWithTenants } from "./prismaStore";

export function tenantAware() {
  return function (target: Record<string, unknown>, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: NextRequest | NextApiRequest, ...args: unknown[]) {
      const host = req.headers.get ? req.headers.get("host") : (req.headers.host as string) || "";

      return runWithTenants(async () => {
        const prisma = getPrismaFromHost(host);
        return originalMethod.apply(this, [req, prisma, ...args]);
      });
    };

    return descriptor;
  };
}
