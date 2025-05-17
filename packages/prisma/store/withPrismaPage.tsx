import type { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { getPrismaFromHost, runWithTenants } from "./prismaStore";

interface WithPrismaPageProps {
  prisma: PrismaClient;
  host: string;
}

export function withPrismaPage<P extends WithPrismaPageProps>(
  WrappedPageComponent: (props: P) => ReactNode | Promise<ReactNode>
): (props: Omit<P, keyof WithPrismaPageProps>) => Promise<ReactNode> {
  return async function WrapperComponent(props: Omit<P, keyof WithPrismaPageProps>) {
    const headersList = await headers();
    const host = headersList.get("host");
    if (!host) {
      // In a real app, you might want to throw a more specific error
      // or redirect, depending on how you want to handle missing host.
      throw new Error("Host header is missing");
    }

    return runWithTenants(async () => {
      const prisma = getPrismaFromHost(host);
      // Pass the props to the component and await the result
      const componentProps = { ...(props as P), prisma, host };
      return await Promise.resolve(WrappedPageComponent(componentProps));
    });
  };
}
