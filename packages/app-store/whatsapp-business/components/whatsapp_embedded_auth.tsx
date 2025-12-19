import { Button } from "@calid/features/ui/components/button";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@calcom/ui/components/alert";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            setup: object;
            featureType: string;
            sessionInfoVersion: string;
          };
        }
      ) => void;
    };
  }
}

interface FBLoginResponse {
  authResponse?: {
    code: string;
    userID: string;
  };
  status: string;
}

interface WhatsAppEmbeddedSignupProps {
  configId: string; // Your Meta app configuration ID
  appId: string; // Your Meta app ID
  teamId?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function WhatsAppEmbeddedSignup({
  configId,
  appId,
  teamId,
  onSuccess,
  onError,
}: WhatsAppEmbeddedSignupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const _onError = (error: string) => {
    setErrorMessage(error);
    onError?.(error);
  };

  useEffect(() => {
    // Check if SDK is already loaded and initialized
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    // Check if script already exists
    if (document.getElementById("facebook-jssdk")) {
      // Script exists but FB not ready yet, wait for it
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          setSdkLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkFB);
    }

    // Define fbAsyncInit before loading script
    window.fbAsyncInit = function () {
      console.log("Initializing FB SDK:  " + appId);
      window.FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0",
      });
      setSdkLoaded(true);
    };

    // Session logging message event listener
    window.addEventListener("message", (event) => {
      console.log("message event received from:", event.origin); // remove after testing
      console.log("message event :", JSON.stringify(event)); // remove after testing
      if (!event.origin.endsWith(`facebook.com`)) return;

      // Phone number selected

      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if ((data.event = "FINISH")) {
            console.log("Setting embed flow data");
            setEmbedFlowData(data.data);
          }
          console.log("message event: ", data); // remove after testing
          // your code goes here
        }
      } catch {
        console.log("message event: ", event.data); // remove after testing
        // your code goes here
      }
    });

    // Load the SDK asynchronously
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById("facebook-jssdk");
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [appId]);

  const [embedFlowData, setEmbedFlowData] = useState<string>({
    waba_id: undefined,
    phone_number_id: undefined,
  });

  const handleEmbeddedSignup = useCallback(() => {
    if (!window.FB) {
      _onError?.("Facebook SDK not loaded");
      return;
    }

    setIsLoading(true);

    // Add a small delay to ensure FB is fully ready
    window.FB.login(
      (response: FBLoginResponse) => {
        if (response.authResponse) {
          console.log("Processing auth code:");
          processAuthCode(response.authResponse.code);
        } else {
          setIsLoading(false);
          _onError?.("User cancelled login or did not fully authorize");
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }, [embedFlowData]);

  // Separate async function
  const processAuthCode = useCallback(
    async (code: string) => {
      const data = embedFlowData;
      try {
        // Send code to your backend
        const result = await fetch(
          `/api/integrations/whatsapp-business/callback?code=${code}&wabaId=${data.waba_id}${
            data.phone_number_id ? `&phoneNumberId=${data.phone_number_id}` : ""
          }${teamId ? `&teamId=${teamId}` : ""}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (result.ok) {
          onSuccess?.();
        } else {
          const error = await result.json();
          _onError?.(error.error || "Failed to complete setup");
        }
      } catch (error) {
        console.error("Error processing embedded signup:", error);
        _onError?.(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [embedFlowData]
  );

  return (
    <div>
      <Button
        onClick={handleEmbeddedSignup}
        disabled={isLoading || !sdkLoaded}
        className="h-9 w-full justify-center rounded-xl">
        {isLoading ? "Connecting..." : "Connect WhatsApp Business"}
      </Button>

      {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
    </div>
  );
}
