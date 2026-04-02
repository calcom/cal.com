"use client";

import process from "node:process";
import { useGeo } from "@calcom/web/app/GeoContext";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

function Provider({ children }: { children: React.ReactNode }) {
  const initializeOnce = useRef(false);
  const { country } = useGeo();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || initializeOnce.current) return;

    initializeOnce.current = true;

    const isUS = country === "US";

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      persistence: isUS ? "localStorage+cookie" : "memory",
      autocapture: false,
      person_profiles: "never",
      request_batching: true,
      capture_pageview: false,
      capture_pageleave: false,
      cookieless_mode: isUS ? undefined : "always",
      disable_session_recording: true,
      advanced_disable_flags: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug();
      },
    });
  }, [country]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export default Provider;
