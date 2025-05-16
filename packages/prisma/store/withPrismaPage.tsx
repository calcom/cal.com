import type { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import type { ComponentType, ReactNode } from "react";

import { getPrismaFromHost, runWithTenants } from "./prismaStore";

interface WithPrismaPageProps {
  prisma: PrismaClient;
  host: string;
}

// Define a type for the PageComponent that will be wrapped
type PageComponent<P extends WithPrismaPageProps> = ComponentType<P>;

export function withPrismaPage<P extends WithPrismaPageProps>(
  WrappedPageComponent: PageComponent<P>
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
      // Spread any additional props the WrappedPageComponent might expect,
      // along with the prisma and host.
      return <WrappedPageComponent {...(props as P)} prisma={prisma} host={host} />;
    });
  };
}
