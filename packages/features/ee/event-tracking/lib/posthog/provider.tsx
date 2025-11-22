"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

import { IS_EUROPE } from "@calcom/lib/timezoneConstants";

function Provider({ children }: { children: React.ReactNode }) {
  const initializeOnce = useRef(false);

  useEffect(() => {
    if (IS_EUROPE) return;

    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || initializeOnce.current) return;

    initializeOnce.current = true;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      autocapture: false,
      person_profiles: "never",
      request_batching: true,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      advanced_disable_flags: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug();
      },
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export default Provider;
