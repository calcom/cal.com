"use client";

import CrispChatProvider from "@calid/features/modules/support/CrispChatProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import CacheProvider from "react-inlinesvg/provider";

import { WebPushProvider } from "@calcom/features/notifications/WebPushContext";
import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";

import CustomerEngagementProvider from "@lib/customerEngagementProvider";
import useIsBookingPage from "@lib/hooks/useIsBookingPage";

import { queryClient } from "./_trpc/query-client";

type ProvidersProps = {
  isEmbed: boolean;
  children: React.ReactNode;
  nonce: string | undefined;
};
export function Providers({ isEmbed, children, nonce: _nonce }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  useEffect(() => {
    const link: HTMLLinkElement = document.createElement("link");
    link.rel = "icon";

    if (!isBookingPage) {
      link.href = "/favicon.ico";
    }

    link.type = "image/png";
    document.head.appendChild(link);
  }, [isBookingPage]);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TrpcProvider>
          {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
          {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
          <CacheProvider>
            <WebPushProvider>
              <CustomerEngagementProvider>
                {!isBookingPage ? <CrispChatProvider>{children}</CrispChatProvider> : children}
              </CustomerEngagementProvider>
            </WebPushProvider>
          </CacheProvider>
        </TrpcProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
