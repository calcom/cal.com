import { Button } from "@calid/features/ui/components/button";
import { useEffect, useState } from "react";

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

  const handleEmbeddedSignup = () => {
    if (!window.FB) {
      onError?.("Facebook SDK not loaded");
      return;
    }

    setIsLoading(true);

    // Add a small delay to ensure FB is fully ready
    setTimeout(() => {
      window.FB.login(
        (response: FBLoginResponse) => {
          if (response.authResponse) {
            const { code } = response.authResponse;
            processAuthCode(code);
          } else {
            setIsLoading(false);
            onError?.("User cancelled login or did not fully authorize");
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
    }, 100);
  };

  // Separate async function
  const processAuthCode = async (code: string) => {
    try {
      // Send code to your backend
      const result = await fetch(
        `/api/integrations/whatsapp-business/callback?code=${code}${teamId ? `&teamId=${teamId}` : ""}`,
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
        const error = await result.text();
        onError?.(error || "Failed to complete setup");
      }
    } catch (error) {
      console.error("Error processing embedded signup:", error);
      onError?.(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleEmbeddedSignup} disabled={isLoading || !sdkLoaded} className="w-full justify-center h-9 rounded-xl">
      {isLoading ? "Connecting..." : "Connect WhatsApp Business"}
    </Button>
  );
}
