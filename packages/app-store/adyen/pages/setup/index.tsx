import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Toaster } from "react-hot-toast";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Badge, Button, showToast } from "@calcom/ui";
import { Icon } from "@calcom/ui";
import { Spinner } from "@calcom/ui/components/icon/Spinner";

import createOAuthUrl from "../../lib/createOAuthUrl";
import "../../lib/styles.css";
import { adyenCredentialKeysSchema } from "../../lib/types";

export interface IAdyenSetupProps {
  merchantAccountId: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return typeof error === "object" && error !== null && "message" in error;
};

export default function AdyenSetup(props: IAdyenSetupProps) {
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment", appId: "adyen" });
  const [adyenPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = adyenPaymentAppCredentials?.userCredentialIds || [-1];
  const showContent =
    !!integrations.data &&
    integrations.isSuccess &&
    !!credentialId &&
    !!props.clientId &&
    !!props.clientSecret;
  const [error, setError] = useState<string | null>(null);
  const [newKeyGenerated, setNewKeyGenerated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [merchantAccountId, setMerchantAccountId] = useState<string | null>(props.merchantAccountId);
  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: (_, variables) => {
      setMerchantAccountId(adyenCredentialKeysSchema.parse(variables.key).merchant_account_id || null);
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const connectWithAdyen = useCallback(async () => {
    setIsConnecting(false);
    setNewKeyGenerated(false);
    window.location.href = await createOAuthUrl({
      clientId: props.clientId,
      redirectUri: encodeURIComponent(`${WEBAPP_URL}/apps/adyen/setup#callback`),
      credentialId,
    });
  }, [credentialId, props.clientId, props.clientSecret]);

  useEffect(() => {
    const handleCallback = async (authorizationCode: string, stateCallback: string) => {
      const cachedData = localStorage.getItem(`appstore_install_${credentialId}`);
      if (cachedData) {
        const { code_verifier: codeVerifier, state: initialState } = JSON.parse(cachedData);

        const body = {
          authorizationCode,
          stateCallback,
          clientId: props.clientId,
          clientSecret: props.clientSecret,
          redirectUri: encodeURIComponent(`${WEBAPP_URL}/apps/adyen/setup#callback`),
          codeVerifier,
          initialState,
        };

        setIsConnecting(true);
        try {
          const response = await fetch("/api/integrations/adyen/callback", {
            method: "POST",
            body: JSON.stringify(body),
          });

          const result = await response?.json();
          if (!response.ok) {
            throw result;
          }
          const key = adyenCredentialKeysSchema.parse(result);
          saveKeysMutation.mutate({
            credentialId,
            key,
          });
        } catch (error) {
          isErrorWithMessage(error) ? setError(error.message) : setError("something went wrong");
        } finally {
          setIsConnecting(false);
          setNewKeyGenerated(true);
          localStorage.removeItem(`appstore_install_${credentialId}`);
        }
      }
    };

    if (typeof window !== "undefined" && credentialId !== -1) {
      const hash = window.location.hash;

      if (hash.startsWith("#callback")) {
        const queryString = hash.split("?")[1];

        if (queryString) {
          const searchParams = new URLSearchParams(queryString);
          const code = searchParams?.get("code");
          const state = searchParams?.get("state");
          const error = searchParams?.get("error");

          if (!code) {
            setError("declined");
          }
          if (error) {
            setError(error);
            alert(error);
            return;
          }

          if (code && state && !newKeyGenerated) {
            handleCallback(code, state);
          }
        }
      }
    }
  }, [credentialId]);

  if (integrations.isPending) {
    return (
      <>
        <div className="absolute z-50 flex h-screen w-full items-center justify-center bg-gray-200">
          <Spinner className="h-24 w-24" />
        </div>
      </>
    );
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="flex w-full items-center justify-center p-4">
          <div className="bg-default border-subtle m-auto flex max-w-[43em] flex-col items-center justify-center gap-4 overflow-auto rounded border p-4 md:p-10">
            {!merchantAccountId ? (
              <>
                <p className="text-default">
                  Connect to an existing Adyen account to receive adyen payments for your paid bookings.
                </p>
                <Button
                  className="adyen-connect"
                  type="button"
                  disabled={isConnecting}
                  onClick={connectWithAdyen}>
                  {t("connect_with")} Adyen
                </Button>
                {error && <p className="text-error mt-1 text-sm">{error}</p>}
                {isConnecting && (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-xs">Connecting...</p>
                    <Spinner className="h-4 w-4" />
                  </div>
                )}
              </>
            ) : (
              <>
                <img
                  className="h-80 w-80"
                  src="/api/app-store/adyen/DIGITAL-Adyen-green-RGB.svg"
                  alt="Adyen Icon"
                />
                <p className="text-lg">Adyen Connected!</p>
                <Badge className="text-md">Merchant Account Id: {merchantAccountId}</Badge>
              </>
            )}

            <div className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Icon name="info" className="mb-0.5 inline-flex h-4 w-4" /> Processing of payments will be
              mapped to adyen merchant account selected while setting up adyen account. If you want to connect
              to a different merchant account, please disconnect and setup the Adyen app again.
            </div>
            <Link href="/apps/adyen">
              <Button color="secondary">Go to App Store Listing</Button>
            </Link>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="adyen" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
