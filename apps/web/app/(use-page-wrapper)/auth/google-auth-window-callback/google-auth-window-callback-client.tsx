"use client";

import { useEffect } from "react";

import { GOOGLE_AUTH_WINDOW_SUCCESS } from "~/auth/google-auth-window";

export function GoogleAuthWindowCallbackClient() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: GOOGLE_AUTH_WINDOW_SUCCESS }, window.location.origin);
      setTimeout(() => window.close(), 300);
    }
  }, []);

  return null;
}
