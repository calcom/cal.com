import type { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, GetServerSidePropsContext } from "next";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

/**
 * Higher-order function that wraps a Next.js getServerSideProps function with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaSsr } from "@calcom/prisma/store/withPrismaSsr";
 * import { getTenantAwarePrisma } from "@calcom/prisma/store/prismaStore";
 *
 * const handler = async (ctx, prisma) => {
 *   // Option 1: Use the injected prisma client
 *   // const users = await prisma.user.findMany();
 *
 *   // Option 2: Use getTenantAwarePrisma() anywhere in your code
 *   const prisma = getTenantAwarePrisma();
 *   const users = await prisma.user.findMany();
 *
 *   return { props: { users } };
 * };
 *
 * export const getServerSideProps = withPrismaSsr(handler);
 * ```
 */
export function withPrismaSsr<P = any>(
  handler: (ctx: GetServerSidePropsContext, prisma: PrismaClient) => Promise<{ props: P }>
): GetServerSideProps<P> {
  return async function wrappedHandler(ctx) {
    try {
      const host = ctx.req.headers.host || "";
      const tenant = getTenantFromHost(host);

      return runWithTenants(tenant, async () => {
        const prisma = getPrisma(tenant);
        return await handler(ctx, prisma);
      });
    } catch (error) {
      console.error(`[withPrismaSsr] Error:`, error);
      return {
        props: {
          error: "Database connection error",
          message: error instanceof Error ? error.message : "Unknown error",
          tenant: ctx.req.headers.host || "unknown",
        } as unknown as P,
      };
    }
  };
}
