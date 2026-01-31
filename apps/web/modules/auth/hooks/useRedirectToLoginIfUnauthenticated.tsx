"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";

const REDIRECT_LOOP_STORAGE_KEY = "cal_auth_redirect_attempt";
const REDIRECT_LOOP_THRESHOLD_MS = 5000; // 5 seconds window to detect loops

export function useRedirectToLoginIfUnauthenticated(isPublic = false) {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();
  const hasAttemptedRedirect = useRef(false);

  useEffect(() => {
    if (isPublic) {
      return;
    }

    if (!loading && !session) {
      // Prevent infinite redirect loops by checking if we've recently redirected
      // This can happen when the session fetch fails due to DB issues but the user
      // has a valid session cookie, causing login page to redirect back
      if (typeof window !== "undefined") {
        const lastRedirectAttempt = sessionStorage.getItem(REDIRECT_LOOP_STORAGE_KEY);
        const now = Date.now();

        if (lastRedirectAttempt) {
          const timeSinceLastRedirect = now - parseInt(lastRedirectAttempt, 10);
          if (timeSinceLastRedirect < REDIRECT_LOOP_THRESHOLD_MS) {
            // We've redirected very recently, likely in a loop
            // Don't redirect again to break the loop
            console.warn(
              "[useRedirectToLoginIfUnauthenticated] Detected potential redirect loop, skipping redirect"
            );
            return;
          }
        }

        // Only redirect once per component mount to prevent multiple redirects
        if (hasAttemptedRedirect.current) {
          return;
        }
        hasAttemptedRedirect.current = true;

        // Store the redirect attempt timestamp
        sessionStorage.setItem(REDIRECT_LOOP_STORAGE_KEY, now.toString());
      }

      const urlSearchParams = new URLSearchParams();
      urlSearchParams.set("callbackUrl", `${WEBAPP_URL}${location.pathname}${location.search}`);
      router.replace(`/auth/login?${urlSearchParams.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, isPublic]);

  // Clear the redirect loop detection when session is successfully loaded
  useEffect(() => {
    if (session && typeof window !== "undefined") {
      sessionStorage.removeItem(REDIRECT_LOOP_STORAGE_KEY);
    }
  }, [session]);

  return {
    loading: loading && !session,
    session,
  };
}
