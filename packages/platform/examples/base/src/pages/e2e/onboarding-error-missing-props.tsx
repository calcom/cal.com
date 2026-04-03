import { OnboardingEmbed } from "@calcom/atoms";
import { useEffect, useState } from "react";

function ErrorDisplay() {
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const check = () => {
      const w = window as typeof window & { __onboardingError?: { code: string; message: string } };
      if (w.__onboardingError) {
        setErrorText(JSON.stringify(w.__onboardingError));
      }
    };
    check();
    const timer = setInterval(check, 50);
    return () => clearInterval(timer);
  }, []);

  return <div id="error-output">{errorText}</div>;
}

export default function OnboardingErrorMissingPropsPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Error test — missing props</h1>
      <ErrorDisplay />
      <OnboardingEmbed
        oAuthClientId=""
        host="http://localhost:3000"
        authorization={{
          scope: [],
          redirectUri: "",
          state: "",
        }}
        onError={(error) => {
          if (typeof window !== "undefined") {
            (window as typeof window & { __onboardingError?: unknown }).__onboardingError = error;
          }
        }}
        onClose={() => {
          const el = document.getElementById("close-output");
          if (el) el.textContent = "closed";
        }}
      />
    </div>
  );
}
