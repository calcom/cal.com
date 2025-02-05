"use client";

import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TrpcProvider>
        {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
        <CacheProvider>{children}</CacheProvider>
      </TrpcProvider>
    </SessionProvider>
  );
}
