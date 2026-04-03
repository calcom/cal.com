"use client";

import { useEffect } from "react";

import { getTargetOrigin } from "~/auth/get-target-origin";

export function EmbedErrorClient({
  code,
  message,
  redirectUri,
}: {
  code: string;
  message: string;
  redirectUri?: string;
}) {
  useEffect(() => {
    const targetOrigin = getTargetOrigin(redirectUri ?? null);
    if (!targetOrigin) return;
    window.parent.postMessage({ type: "onboarding:error", code, message }, targetOrigin);
  }, [code, message, redirectUri]);

  return null;
}
