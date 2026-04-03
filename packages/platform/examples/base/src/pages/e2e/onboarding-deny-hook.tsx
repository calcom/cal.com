import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo } from "react";

import { getEnvClientId } from "./helpers";

export default function OnboardingDenyHookPage() {
  const clientId = getEnvClientId();
  const state = useMemo(() => crypto.randomUUID(), []);

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Authorization denied hook test</h1>
      <div id="denied-output" />
      <div id="embed-state" data-state={state} />
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        user={{
          email: "deny-test@test.com",
          name: "DenyTest",
          username: "denytest",
        }}
        authorization={{
          scope: ["EVENT_TYPE_READ"],
          redirectUri: "http://localhost:4322",
          state,
        }}
        onAuthorizationAllowed={({ code }) => {
          const el = document.getElementById("success-output");
          if (el) el.textContent = code;
        }}
        onAuthorizationDenied={() => {
          const el = document.getElementById("denied-output");
          if (el) el.textContent = "denied";
        }}
        onError={(error) => {
          const el = document.getElementById("error-output");
          if (el) el.textContent = JSON.stringify(error);
        }}
      />
    </div>
  );
}
