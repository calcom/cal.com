"use client";

import { type DehydratedState } from "@tanstack/react-query";
import { HydrateClient } from "app/_trpc/HydrateClient";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import PlainChat from "@lib/plain/dynamicProvider";

type ProvidersProps = {
  children: React.ReactNode;
  dehydratedState: DehydratedState;
};
export function Providers({ children, dehydratedState }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  return (
    <SessionProvider>
      <TrpcProvider>
        <HydrateClient state={dehydratedState}>
          {!isBookingPage ? <PlainChat /> : null}
          {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
          <CacheProvider>{children}</CacheProvider>
        </HydrateClient>
      </TrpcProvider>
    </SessionProvider>
  );
}
