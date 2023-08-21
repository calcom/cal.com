import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast, TextField } from "@calcom/ui";

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

  if (integrations.isLoading) {
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
              <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>

              <ol className="text-default ml-1 list-decimal pl-2">
                {/* @TODO: translate */}
                <li>
                  Log into your Paypal Developer account and create a new app{" "}
                  <a
                    target="_blank"
                    href="https://developer.paypal.com/dashboard/applications/"
                    className="text-orange-600 underline">
                    {t("here")}
                  </a>
                  .
                </li>
                <li>Choose a name for your application.</li>
                <li>Select Online payments solution.</li>
                <li>Choose &quot;No&quot; for &quot;Using online platform&quot;.</li>
                <li>CheckoutAPI as integration product.</li>
                <li>Accept terms and Create APP.</li>
                <li>Go back to dashboard, click on new app and copy the credentials.</li>
                <li>Paste them on the required field and save them.</li>
                <li>You&apos;re all setup.</li>
              </ol>
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
