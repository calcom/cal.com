import type { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, GetServerSidePropsContext } from "next";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

export function withPrismaSsr<P = any>(
  handler: (ctx: GetServerSidePropsContext, prisma: PrismaClient) => Promise<{ props: P }>
): GetServerSideProps<P> {
  return async function wrappedHandler(ctx) {
    const host = ctx.req.headers.host || "";
    const tenant = getTenantFromHost(host);

    return runWithTenants(async () => {
      const prisma = getPrisma(tenant);
      return await handler(ctx, prisma);
    });
  };
}
