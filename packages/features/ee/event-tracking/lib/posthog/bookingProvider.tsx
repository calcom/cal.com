"use client";

import { useSession } from "next-auth/react";

import { useFlags } from "@calcom/features/flags/hooks";

import Provider from "./provider";

function BookingPostHogProvider({ children }: { children: React.ReactNode }) {
  const flags = useFlags();
  const session = useSession();

  const isPostHogEnabled = flags["posthog-booking-tracking"] && session.data?.user;

  if (!isPostHogEnabled) {
    return <>{children}</>;
  }

  return <Provider enableSessionRecording={true}>{children}</Provider>;
}

export default BookingPostHogProvider;
