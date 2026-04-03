import { OnboardingEmbed } from "@calcom/atoms";

import { getEnvClientId } from "./helpers";

export default function OnboardingDenyRedirectPage() {
  const clientId = getEnvClientId();
  const state = "deny-redirect-test-state";

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Authorization denied redirect test</h1>
      <div id="embed-state" data-state={state} />
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        user={{
          email: "deny-redirect@test.com",
          name: "DenyRedirect",
          username: "denyredirect",
        }}
        authorization={{
          scope: ["EVENT_TYPE_READ"],
          redirectUri: "http://localhost:4322/e2e/onboarding-redirect-target",
          state,
        }}
        onAuthorizationAllowed={({ code }) => {
          const el = document.getElementById("success-output");
          if (el) el.textContent = code;
        }}
        onError={(error) => {
          console.error("onError:", error);
        }}
      />
    </div>
  );
}
