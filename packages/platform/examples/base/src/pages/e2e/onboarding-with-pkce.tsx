import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo, useState } from "react";

import { getEnvClientId } from "./helpers";

async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { codeVerifier, codeChallenge };
}

export default function OnboardingPkceTestPage() {
  const clientId = getEnvClientId();
  const redirectUri = "http://localhost:4322";
  const state = useMemo(() => crypto.randomUUID(), []);
  const [pkce, setPkce] = useState<{ codeVerifier: string; codeChallenge: string } | null>(null);

  useMemo(() => {
    generatePkce().then(setPkce);
  }, []);

  if (!pkce) return null;

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Cal user onboarding test (PKCE)</h1>
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        authorization={{
          scope: ["EVENT_TYPE_READ"],
          redirectUri,
          state,
          codeChallenge: pkce.codeChallenge,
        }}
        onAuthorizationAllowed={({ code }) => {
          alert(`Auth code: ${code}`);
        }}
        onError={(error) => {
          console.error("onError:", error);
          alert(`Error: ${error.code} — ${error.message}`);
        }}
        onClose={() => {
          console.log("onClose — dialog dismissed");
        }}
      />
    </div>
  );
}
