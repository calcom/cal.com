import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo } from "react";

import { getEnvClientId } from "./helpers";

export default function OnboardingUserPropsTestPage() {
  const clientId = getEnvClientId();
  const redirectUri = "http://localhost:4322";
  const state = useMemo(() => crypto.randomUUID(), []);

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Cal user onboarding test (user props prefill)</h1>
      <OnboardingEmbed
        oAuthClientId={clientId}
        theme="dark"
        host="http://localhost:3000"
        user={{
          email: "bob@yahoo.com",
          name: "Bob",
          username: "bob100",
        }}
        authorization={{
          scope: ["EVENT_TYPE_READ"],
          redirectUri,
          state,
        }}
        onAuthorizationAllowed={({ code }) => {
          alert(`Success! Auth code: ${code}`);
        }}
        onError={(error) => {
          console.error("onError:", error);
        }}
        onClose={() => {
          console.log("onClose — dialog dismissed");
        }}
      />
    </div>
  );
}
