"use client";

import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import PlainChat from "@lib/plain/dynamicProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const isBookingPage = useIsBookingPage();

  return (
    <SessionProvider>
      <TrpcProvider>
        {!isBookingPage ? <PlainChat /> : null}
        {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
        <CacheProvider>{children}</CacheProvider>
      </TrpcProvider>
    </SessionProvider>
  );
}
