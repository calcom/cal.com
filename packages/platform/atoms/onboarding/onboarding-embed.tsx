"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@calcom/ui/components/icon";

import { Dialog, DialogContent, DialogTrigger } from "../src/components/ui/dialog";
import { ContinueWithCalcomDark, ContinueWithCalcomLight } from "./continue-with-calcom";
import type { OnboardingEmbedProps } from "./types";

const DEFAULT_HOST = "https://app.cal.com";

export function OnboardingEmbed({
  oAuthClientId,
  host = DEFAULT_HOST,
  theme = "light",
  user,
  authorization,
  onAuthorizationAllowed,
  onError,
  onAuthorizationDenied,
  onClose,
  trigger,
}: OnboardingEmbedProps) {
  const [open, setOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const missingProps = validateProps({ oAuthClientId, authorization });
  const redirectOnAuthorizationAllowed = !onAuthorizationAllowed;
  const redirectOnAuthorizationDenied = !onAuthorizationDenied;

  const iframeSrc = missingProps
    ? ""
    : buildOnboardingUrl({
        host,
        oAuthClientId,
        theme,
        email: user?.email,
        name: user?.name,
        username: user?.username,
        scope: authorization.scope.join(" "),
        redirectUri: authorization.redirectUri,
        state: authorization.state,
        codeChallenge: authorization.codeChallenge,
      });

  useEffect(() => {
    if (missingProps) {
      const message = `<OnboardingEmbed /> is missing required props: ${missingProps.join(", ")}`;
      onError?.({ code: "INVALID_PROPS", message });
      return;
    }

    const handler = (event: MessageEvent) => {
      const isEventFromCalIframe = event.origin === host;
      if (!isEventFromCalIframe) return;

      if (event.data?.type === "authorization:allowed") {
        if (event.data.state !== authorization.state) {
          onError?.({ code: "STATE_MISMATCH", message: "State mismatch — possible CSRF attack" });
          return;
        }

        if (redirectOnAuthorizationAllowed) {
          window.location.href = buildRedirectUrl(authorization.redirectUri, {
            code: event.data.code,
            state: authorization.state,
          });
          return;
        }

        onAuthorizationAllowed({ code: event.data.code });
        setOpen(false);
      }

      if (event.data?.type === "onboarding:error") {
        if (redirectOnAuthorizationAllowed) {
          window.location.href = buildRedirectUrl(authorization.redirectUri, {
            error: event.data.code,
            state: authorization.state,
          });
          return;
        }

        onError?.({ code: event.data.code, message: event.data.message });
      }

      if (event.data?.type === "authorization:denied") {
        if (redirectOnAuthorizationDenied) {
          window.location.href = buildRedirectUrl(authorization.redirectUri, {
            error: "access_denied",
            state: authorization.state,
          });
          return;
        }

        onAuthorizationDenied();
        setOpen(false);
      }

      if (event.data?.type === "onboarding:close") {
        onClose?.();
        setOpen(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [host, missingProps, redirectOnAuthorizationAllowed, redirectOnAuthorizationDenied, authorization, onAuthorizationAllowed, onError, onAuthorizationDenied, onClose]);

  if (missingProps) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose?.();
        } else {
          setIframeLoading(true);
        }
        setOpen(isOpen);
      }}>
      <DialogTrigger asChild>
        {trigger || (
          <button type="button" aria-label="Continue with Cal.com" className="inline-flex cursor-pointer border-none bg-transparent p-0">
            {theme === "dark" ? <ContinueWithCalcomDark /> : <ContinueWithCalcomLight />}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <div className="relative" style={{ height: "80vh" }}>
          {iframeLoading && (
            <div
              className={`absolute inset-0 flex items-center justify-center rounded-lg${theme === "dark" ? " dark" : ""}`}
              // note(Lauris): use inline style instead of bg-[--cal-bg] because CSS variables from globals.css take a moment to resolve, causing a flash of white before the dark background appears
              style={{ background: theme === "dark" ? "#0f0f0f" : "#ffffff" }}>
              <Spinner className="h-8 w-8" />
            </div>
          )}
          <iframe
            src={iframeSrc}
            title="Cal.com Onboarding"
            className="w-full h-full rounded-lg border-none"
            onLoad={() => setIframeLoading(false)}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function validateProps({
  oAuthClientId,
  authorization,
}: Pick<OnboardingEmbedProps, "oAuthClientId" | "authorization">): string[] | null {
  const missing: string[] = [];
  if (!oAuthClientId) missing.push("oAuthClientId");
  if (!authorization.redirectUri) missing.push("authorization.redirectUri");
  if (!authorization.state) missing.push("authorization.state");
  if (!authorization.scope?.length) missing.push("authorization.scope");
  return missing.length > 0 ? missing : null;
}

function buildRedirectUrl(redirectUri: string, params: Record<string, string>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildOnboardingUrl({
  host,
  oAuthClientId,
  theme,
  email,
  name,
  username,
  scope,
  redirectUri,
  state,
  codeChallenge,
}: {
  host: string;
  oAuthClientId: string;
  theme: string;
  email?: string;
  name?: string;
  username?: string;
  scope: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
}): string {
  const params = new URLSearchParams({
    client_id: oAuthClientId,
    scope,
    state,
    theme,
    redirect_uri: redirectUri,
    onboardingEmbed: "true",
  });

  if (email) params.set("email", email);
  if (name) params.set("name", name);
  if (username) params.set("username", username);
  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  return `${host}/api/onboarding-embed/verify?${params.toString()}`;
}
