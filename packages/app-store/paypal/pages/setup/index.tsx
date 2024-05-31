import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast, TextField } from "@calcom/ui";
import { Icon } from "@calcom/ui";

export default function PayPalSetup() {
  const [newClientId, setNewClientId] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment", appId: "paypal" });
  const [paypalPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = paypalPaymentAppCredentials?.userCredentialIds || [-1];
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

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/paypal/icon.svg" alt="Paypal Payment Logo" />
              <p className="text-default mt-5 text-lg">Paypal</p>
            </div>
            <form autoComplete="off" className="mt-5">
              <TextField
                label="Client Id"
                type="text"
                name="client_id"
                id="client_id"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                role="presentation"
              />

              <TextField
                label="Secret Key"
                type="password"
                name="access_token"
                id="access_token"
                value={newSecretKey}
                autoComplete="new-password"
                role="presentation"
                onChange={(e) => setNewSecretKey(e.target.value)}
              />

              {/* Button to submit */}
              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="secondary"
                  onClick={() => {
                    saveKeysMutation.mutate({
                      credentialId,
                      key: {
                        client_id: newClientId,
                        secret_key: newSecretKey,
                      },
                    });
                  }}>
                  {t("save")}
                </Button>
              </div>
            </form>
            <div>
              <p className="text-lgf text-default mt-5 font-bold">Getting started with Paypal APP</p>
              <p className="text-default font-semi mt-2">
                Here in Cal.com we offer Paypal as one of our payment gateway. You can use your own Paypal
                Business account to receive payments from your customers enabling and setting up price and
                currency for each of your event types.
              </p>

              <p className="text-lgf text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" /> Important requirements:
              </p>
              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>Paypal Business account</li>
                <li>Paypal Developer account</li>
              </ul>

              <p className="text-default mb-2 mt-5 font-bold">Resources:</p>
              <a
                className="text-orange-600 underline"
                target="_blank"
                href="https://developer.paypal.com/api/rest/#link-getclientidandclientsecret">
                Link to Paypal developer API REST Setup Guide:
                https://developer.paypal.com/api/rest/#link-getclientidandclientsecret
              </a>

              <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>
              <p className="text-default font-semi mt-2">
                Remember to only proceed with the following steps if your account has already been upgraded to
                a business account. Also keep in mind that some of the following steps might be different
                since Paypal offers different experiences based on your country.
              </p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                {/* @TODO: translate */}
                <li>
                  Log into your Paypal Developer account and create a new app{" "}
                  <a
                    target="_blank"
                    href="https://developer.paypal.com/dashboard/applications/live"
                    className="text-orange-600 underline">
                    {t("here")}
                  </a>
                  .
                </li>
                <li>Choose a name for your application.</li>
                <li>Click on the Create App button</li>

                <li>
                  Go back to{" "}
                  <a
                    className="text-orange-600 underline"
                    href="https://developer.paypal.com/dashboard/applications/live">
                    dashboard
                  </a>
                  , click on new app created.
                </li>
                <li>Copy the Client ID and Secret Key using copy buttons one by one.</li>
                <li>Paste them on the required field and save them.</li>
                <li>You should be all setup after this.</li>
              </ol>
              <p className="text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" />
                Reminder:
              </p>
              <p className="text-default mt-2">
                Our integration creates a specific webhook on your Paypal account that we use to report back
                transactions to our system. If you delete this webhook, we will not be able to report back and
                you should Uninstall and Install the app again for this to work again. Uninstalling the app
                won&apos;t delete your current event type price/currency configuration but you would not be
                able to receive bookings.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="ml-5 mt-5">
          <div>Paypal</div>
          <div className="mt-3">
            <Link href="/apps/paypal" passHref={true} legacyBehavior>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
