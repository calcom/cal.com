"use client";

import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";
import { WebPushProvider } from "@calcom/web/modules/notifications/components/WebPushContext";
import { AnchoredToastProvider, ToastProvider } from "@coss/ui/components/toast";
import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";
import { GeoProvider } from "./GeoContext";

type ProvidersProps = {
  isEmbed: boolean;
  children: React.ReactNode;
  nonce: string | undefined;
  country: string;
};
export function Providers({ isEmbed, children, country }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  return (
    <GeoProvider country={country}>
      <SessionProvider>
        <TrpcProvider>
          <ToastProvider position="bottom-center">
            <AnchoredToastProvider>
              {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
              {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
              <CacheProvider>
                <WebPushProvider>{children}</WebPushProvider>
              </CacheProvider>
            </AnchoredToastProvider>
          </ToastProvider>
        </TrpcProvider>
      </SessionProvider>
    </GeoProvider>
  );
}