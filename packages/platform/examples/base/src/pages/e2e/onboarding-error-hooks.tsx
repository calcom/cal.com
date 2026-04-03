import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo } from "react";

import { getEnvClientId } from "./helpers";

export default function OnboardingErrorHooksPage() {
  const clientId = getEnvClientId();
  const state = useMemo(() => crypto.randomUUID(), []);

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Error & close hooks test</h1>
      <div id="error-output" />
      <div id="close-output" />
      <div id="embed-state" data-state={state} />
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        user={{
          email: "error-test@test.com",
          name: "ErrorTest",
          username: "errortest",
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
        onError={(error) => {
          const el = document.getElementById("error-output");
          if (el) el.textContent = JSON.stringify(error);
        }}
        onClose={() => {
          const el = document.getElementById("close-output");
          if (el) el.textContent = "closed";
        }}
      />
    </div>
  );
}
