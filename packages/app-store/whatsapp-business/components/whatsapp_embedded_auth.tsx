import { Button } from "@calid/features/ui/components/button";
import { useRouter } from "next/navigation";
import { useRef, useCallback, useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
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
  configId: string;
  appId: string;
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
  const router = useRouter();
  const { t } = useLocale();

  const _onError = (error: string) => {
    setErrorMessage(error);
    onError?.(error);
  };

  useEffect(() => {
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    if (document.getElementById("facebook-jssdk")) {
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          setSdkLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkFB);
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v22.0",
      });
      setSdkLoaded(true);
    };

    window.addEventListener("message", (event) => {
      console.log("message event received from:", event.origin);
      console.log("message event :", JSON.stringify(event));
      if (!event.origin.endsWith(`facebook.com`)) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if ((data.event = "FINISH")) {
            console.log("Setting embed flow data");
            setEmbedFlowData(data.data);
          }
          console.log("message event: ", data);
        }
      } catch {
        console.log("message event: ", event.data);
      }
    });

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

    window.FB.login(
      (response: FBLoginResponse) => {
        if (response.authResponse) {
          console.log("Processing auth code:");
          setTimeout(() => {
            processAuthCodeRef.current?.(response.authResponse.code);
          }, 3000);
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
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }, [embedFlowData]);

  const processAuthCode = useCallback(
    async (code: string) => {
      const data = embedFlowData;
      try {
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
          const json = await result.json();
          router.push(json.url);
          onSuccess?.();
        } else {
          const error = await result.json();
          _onError?.(error.error || "Failed to complete setup");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error processing embedded signup:", error);
        _onError?.(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
      }
    },
    [embedFlowData]
  );

  const processAuthCodeRef = useRef<typeof processAuthCode>();

  useEffect(() => {
    processAuthCodeRef.current = processAuthCode;
  }, [processAuthCode]);

  return (
    <div>
      <div className="mb-2 mt-1 text-sm">
        <h1 className="mb-2 mt-1 text-center text-sm font-bold">{t("embedded_signup_header")}</h1>
        <h1 className="mb-2 mt-1 text-center text-sm font-bold">{t("embedded_signup_header2")}</h1>
        {t("configure_phone_number_with_embedded_signup")}
        <div></div>
        <div>
          {t("2. View limitations and pricing from Meta for the Cloud API.")}{" "}
          <a
            className="text-blue hover:underline"
            href="https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users#limitations"
            target="_blank"
            rel="noopener noreferrer">
            ({t("here")})
          </a>
        </div>
        <div>
          {t("complete_onboarding_flow_payment")}
          <a
            className="text-blue hover:underline"
            href="https://www.facebook.com/business/help/488291839463771"
            target="_blank"
            rel="noopener noreferrer">
            ({t("here")})
          </a>
        </div>

        <div>{t("skip_sharing_chat")}</div>
      </div>

      <Button
        onClick={() => {
          window.FB.getLoginStatus((statusResponse) => {
            if (statusResponse.status === "connected") {
              window.FB.logout(() => {
                // Now safe to restart embedded signup
                handleEmbeddedSignup();
              });
            } else {
              handleEmbeddedSignup();
            }
          });
        }}
        disabled={isLoading || !sdkLoaded}
        className="h-9 w-full justify-center rounded-xl">
        {isLoading ? "Connecting..." : "Connect WhatsApp Business"}
      </Button>

      {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}

      <div className="mt-6 space-y-4"></div>
    </div>
  );
}
