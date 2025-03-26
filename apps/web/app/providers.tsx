"use client";

import { queryClient } from "app/_trpc/query-client";
import { trpcClient } from "app/_trpc/trpc-client";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import CacheProvider from "react-inlinesvg/provider";

import { WebPushProvider } from "@calcom/features/notifications/WebPushContext";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import PlainChat from "@lib/plain/dynamicProvider";

type ProvidersProps = {
  children: React.ReactNode;
};
export function Providers({ children }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  // Prefetching
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["viewer.features.map"],
      queryFn: () => trpcClient.viewer.features.map.query(),
    });
    queryClient.prefetchQuery({
      queryKey: ["viewer.teams.hasTeamPlan"],
      queryFn: () => trpcClient.viewer.teams.hasTeamPlan.query(),
    });
    queryClient.prefetchQuery({
      queryKey: ["viewer.public.session"],
      queryFn: () => trpcClient.viewer.public.session.query(),
    });
    queryClient.prefetchQuery({
      queryKey: ["viewer.me.get"],
      queryFn: () => trpcClient.viewer.me.get.query(),
    });
  }, []);

  return (
    <SessionProvider>
      <TrpcProvider>
        {!isBookingPage ? <PlainChat /> : null}
        {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
        <CacheProvider>
          <WebPushProvider>{children}</WebPushProvider>
        </CacheProvider>
      </TrpcProvider>
    </SessionProvider>
  );
}
