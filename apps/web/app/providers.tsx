"use client";

import OneHashChatProvider from "@calid/features/modules/support/OneHashChatProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

import { WebPushProvider } from "@calcom/features/notifications/WebPushContext";
import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";

import { queryClient } from "./_trpc/query-client";

type ProvidersProps = {
  isEmbed: boolean;
  children: React.ReactNode;
  nonce: string | undefined;
};
export function Providers({ isEmbed, children, nonce: _nonce }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TrpcProvider>
          {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
          {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
          <CacheProvider>
            <WebPushProvider>
              {!isBookingPage ? <OneHashChatProvider>{children}</OneHashChatProvider> : children}
            </WebPushProvider>
          </CacheProvider>
        </TrpcProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
