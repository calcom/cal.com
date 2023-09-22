import { auth, Client, webln } from "@getalby/sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast } from "@calcom/ui";
import { Info } from "@calcom/ui/components/icon";

import { albyCredentialKeysSchema } from "../../lib/albyCredentialKeysSchema";

export interface IAlbySetupProps {
  email?: string;
  lightningAddress?: string;
}

export default function AlbySetup(props: IAlbySetupProps) {
  const params = globalThis.window && new URLSearchParams(window.location.search);
  if (params?.get("callback") === "true") {
    return <AlbySetupCallback />;
  }

  return <AlbySetupPage {...props} />;
}

function AlbySetupCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.opener) {
      setError("Something went wrong. Opener not available. Please contact support@getalby.com");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (!code) {
      setError("declined");
    }
    if (error) {
      setError(error);
      alert(error);
      return;
    }

    window.opener.postMessage({
      type: "alby:oauth:success",
      payload: { code },
    });
    window.close();
  }, []);

  return (
    <div>
      {error && <p>Authorization failed: {error}</p>}
      {!error && <p>Connecting...</p>}
    </div>
  );
}

function AlbySetupPage(props: IAlbySetupProps) {
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment", appId: "alby" });
  const [albyPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = albyPaymentAppCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;
  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const connectWithAlby = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_ALBY_CLIENT_ID || !process.env.NEXT_PUBLIC_ALBY_CLIENT_SECRET) {
      throw new Error("Alby .env configuration missing");
    }

    const authClient = new auth.OAuth2User({
      client_id: process.env.NEXT_PUBLIC_ALBY_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_ALBY_CLIENT_SECRET,
      callback: process.env.NEXT_PUBLIC_WEBAPP_URL + "/apps/alby/setup?callback=true",
      scopes: ["invoices:read", "account:read"],
      user_agent: "cal.com",
    });

    const weblnOAuthProvider = new webln.OauthWeblnProvider({
      auth: authClient,
    });
    await weblnOAuthProvider.enable();

    const client = new Client(authClient);
    const accountInfo = await client.accountInformation({});
    const webhookEndpoint = await client.createWebhookEndpoint({
      filter_types: ["invoice.incoming.settled"],
      url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/alby/webhook`,
      description: "Cal.com",
    });

    saveKeysMutation.mutate({
      credentialId,
      key: albyCredentialKeysSchema.parse({
        account_id: accountInfo.identifier,
        account_email: accountInfo.email,
        account_lightning_address: accountInfo.lightning_address,
        webhook_endpoint_id: webhookEndpoint.id,
        webhook_endpoint_secret: webhookEndpoint.endpoint_secret,
      }),
    });
  }, [credentialId, saveKeysMutation]);

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="flex w-full items-center justify-center p-4">
          <div className="bg-default border-subtle m-auto flex max-w-[43em] flex-col items-center justify-center gap-4 overflow-auto rounded border p-4 md:p-10">
            {!props.lightningAddress ? (
              <>
                <p className="text-default">
                  Create or connect to an existing Alby account to receive lightning payments for your paid
                  bookings.
                </p>
                <button
                  className="font-body flex h-10 w-56 items-center justify-center gap-2 rounded-md font-bold text-black shadow transition-all hover:brightness-90 active:scale-95"
                  style={{
                    background: "linear-gradient(180deg, #FFDE6E 63.72%, #F8C455 95.24%)",
                  }}
                  type="button"
                  onClick={connectWithAlby}>
                  <img className="h-8 w-8" src="/api/app-store/alby/icon2.svg" alt="Alby Logo" />
                  <span className="mr-2">Connect with Alby</span>
                </button>
              </>
            ) : (
              <>
                <p>Alby Connected!</p>
                <p>Email: {props.email}</p>
                <p>Lightning Address: {props.lightningAddress}</p>
              </>
            )}

            {/* TODO: remove when invoices are generated using user identifier */}
            <div className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
              <Info className="mb-0.5 inline-flex h-4 w-4" /> Your Alby lightning address will be used to
              generate invoices. If you update your lightning address, please disconnect and setup the Alby
              app again.
            </div>
          </div>
        </div>
      ) : (
        <div className="ml-5 mt-5">
          <div>Alby</div>
          <div className="mt-3">
            <Link href="/apps/alby" passHref={true} legacyBehavior>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
