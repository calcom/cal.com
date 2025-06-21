import { headers } from "next/headers";
import type { ReactNode } from "react";

import type { PrismaClient as ExtendedPrismaClient } from "@calcom/prisma";

import { getPrisma, runWithTenants } from "./prismaStore";
import { getTenantFromHost } from "./tenants";

interface WithPrismaPageInjectedProps {
  prisma: ExtendedPrismaClient;
  host: string;
}

// Update: Allow wrapping any component, not just those that extend WithPrismaPageProps
export function withPrismaPage<P>(
  WrappedPageComponent: (props: P & WithPrismaPageInjectedProps) => ReactNode | Promise<ReactNode>
): (props: P) => Promise<ReactNode> {
  return async function WrapperComponent(props: P) {
    const headersList = await headers();
    const host = headersList.get("host");
    if (!host) {
      // In a real app, you might want to throw a more specific error
      // or redirect, depending on how you want to handle missing host.
      throw new Error("Host header is missing");
    }
    const tenant = getTenantFromHost(host);
    return runWithTenants(tenant, async () => {
      const prisma = getPrisma(tenant);
      // Pass the props to the component and await the result
      const componentProps = { ...props, prisma, host };
      return await Promise.resolve(WrappedPageComponent(componentProps));
    });
  };
}
