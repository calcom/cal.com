import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { headers as nextHeaders } from "next/headers";

import { runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

/**
 * Higher-order function that wraps a Next.js getServerSideProps function with tenant-aware Prisma client.
 * This ensures that the correct database is selected based on the request host.
 *
 * @example
 * ```typescript
 * import { withPrismaSsr } from "@calcom/prisma/store/withPrismaSsr";
 *
 * const handler = async (ctx) => {
 *   // Use getTenantAwarePrisma() anywhere in your code
 *   const prisma = getTenantAwarePrisma();
 *   const users = await prisma.user.findMany();
 *   return { props: { users } };
 * };
 *
 * export const getServerSideProps = withPrismaSsr(handler);
 * ```
 */
export function withPrismaSsr(
  hof: <T extends Record<string, any>>(
    getServerSideProps: GetServerSideProps<T>
  ) => (context: GetServerSidePropsContext) => Promise<T>
) {
  return function <T extends Record<string, any>>(getServerSideProps: GetServerSideProps<T>) {
    const wrapped = hof(getServerSideProps);
    return async function (context: GetServerSidePropsContext) {
      let host = "";
      try {
        const hdrs = await nextHeaders();
        host = hdrs.get("host") || "";
      } catch {
        host = "";
      }
      const tenant = getTenantFromHost(host);
      return runWithTenants(tenant, async () => wrapped(context));
    };
  };
}
