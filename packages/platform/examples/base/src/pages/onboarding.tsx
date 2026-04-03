import { OnboardingEmbed } from "@calcom/atoms";
import { useMemo } from "react";

export default function OnboardingTestPage() {
  const clientId = process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_OAUTH2_REDIRECT_URI || "http://localhost:4321";
  const state = useMemo(() => crypto.randomUUID(), []);

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Cal user onboarding test</h1>
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
          console.log("onAuthorizationAllowed — auth code:", code);
          alert(`Success! Auth code: ${code}`);
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
