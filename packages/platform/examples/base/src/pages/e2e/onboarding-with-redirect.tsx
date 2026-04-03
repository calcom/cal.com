import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo } from "react";

import { getEnvClientId } from "./helpers";

export default function OnboardingRedirectTestPage() {
  const clientId = getEnvClientId();
  const redirectUri = "http://localhost:4322/e2e/onboarding-redirect-target";
  const state = useMemo(() => crypto.randomUUID(), []);

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Cal user onboarding test (redirect mode)</h1>
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        authorization={{
          scope: ["EVENT_TYPE_READ"],
          redirectUri,
          state,
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
