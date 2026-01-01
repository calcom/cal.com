"use client";

import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

import { WebPushProvider } from "@calcom/features/notifications/WebPushContext";
import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";

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
          {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
          {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
          <CacheProvider>
            <WebPushProvider>{children}</WebPushProvider>
          </CacheProvider>
        </TrpcProvider>
      </SessionProvider>
    </GeoProvider>
  );
}
