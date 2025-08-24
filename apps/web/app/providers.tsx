"use client";

import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";

import { WebPushProvider } from "@calcom/features/notifications/WebPushContext";
import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import PlainChat from "@lib/plain/dynamicProvider";

type ProvidersProps = {
  isEmbed: boolean;
  children: React.ReactNode;
  nonce: string | undefined;
};
export function Providers({ isEmbed, children, nonce }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  return (
    <SessionProvider>
      <TrpcProvider>
        {!isBookingPage ? <PlainChat nonce={nonce} /> : null}
        {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
        {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
        <CacheProvider>
          <WebPushProvider>{children}</WebPushProvider>
        </CacheProvider>
      </TrpcProvider>
    </SessionProvider>
  );
}
