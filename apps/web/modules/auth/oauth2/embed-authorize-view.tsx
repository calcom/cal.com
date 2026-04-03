"use client";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import { getTargetOrigin } from "~/auth/get-target-origin";

import { Authorize } from "./authorize-view";

export function EmbedAuthorize() {
  const searchParams = useCompatSearchParams();
  const state = searchParams?.get("state") as string;
  const targetOrigin = getTargetOrigin(searchParams?.get("redirect_uri"));

  return (
    <Authorize
      classNames={{
        container: "flex min-h-screen flex-col bg-default text-default",
        card: "flex flex-1 flex-col px-9 pt-2 pb-3",
        footer: "mt-auto",
      }}
      callbacks={{
        onAuthorizationAllowed: (data) => {
          if (!targetOrigin) return;
          window.parent.postMessage(
            { type: "authorization:allowed", code: data.authorizationCode, state },
            targetOrigin
          );
        },
        onAuthorizationError: (error) => {
          if (!targetOrigin) return;
          window.parent.postMessage(
            { type: "onboarding:error", code: "AUTHORIZATION_FAILED", message: error.message },
            targetOrigin
          );
        },
        onAuthorizationDenied: () => {
          if (!targetOrigin) return;
          window.parent.postMessage({ type: "authorization:denied" }, targetOrigin);
        },
      }}
    />
  );
}

export default EmbedAuthorize;
