import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast } from "@calcom/ui";

export interface IPaywongPaymentsProps {
  app_id: string;
  public_key: string;
  secret_key: string;
}

export default function PaywongPayments(props: IPaywongPaymentsProps) {
  const [newAppId, setNewAppId] = useState(props.app_id);
  const [newPublicKey, setNewPublicKey] = useState(props.public_key);
  const [newSecretKey, setNewSecretKey] = useState(props.secret_key);

  const { t } = useLocale();
  const router = useRouter();

  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment" });

  const paywongPayments: { credentialIds: number[] } | undefined = integrations.data?.items.find(
    (item: { type: string }) => item.type === "paywong-payments_payment"
  );

  const [credentialId] = paywongPayments?.credentialIds || [false];
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

  const saveKeys = async (key: { appId: string; publicKey: string; secretKey: string }) => {
    if (typeof credentialId !== "number") {
      return;
    }

    saveKeysMutation.mutate({
      credentialId,
      key: {
        app_id: key.appId,
        public_key: key.publicKey,
        secret_key: key.secretKey,
      },
    });

    return true;
  };

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-white dark:bg-black" />;
  }
  return (
    <div className="flex h-screen bg-gray-200 dark:bg-black">
      {showContent ? (
        <div className="m-auto max-w-[43em] overflow-auto rounded bg-white pb-10 dark:bg-black md:p-10">
          <div className="md:flex md:flex-row">
            <div className="invisible md:visible">
              <img
                className="h-11"
                src="/api/app-store/paywong-payments/icon.svg"
                alt="Paywong Payments Logo"
              />
            </div>
            <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
              <p className="text-lg">Payments Wong</p>
              <form autoComplete="off">
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-white" htmlFor="app_id">
                    App Id
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="app_id"
                      id="app_id"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:text-black sm:text-sm"
                      value={newAppId}
                      autoComplete="new-password"
                      onChange={(e) => setNewAppId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-white"
                    htmlFor="public_key">
                    Public Key
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="public_key"
                      id="public_key"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:text-black sm:text-sm"
                      value={newPublicKey}
                      autoComplete="new-password"
                      onChange={(e) => setNewPublicKey(e.target.value)}
                    />
                  </div>

                  <div className="mt-5">
                    <label
                      className="block text-sm font-medium text-gray-700 dark:text-white"
                      htmlFor="secret_key">
                      Secret Key
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="secret_key"
                        id="secret_key"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:text-black sm:text-sm"
                        value={newSecretKey}
                        autoComplete="new-password"
                        onChange={(e) => setNewSecretKey(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {/* Button to submit */}
                <div className="mt-5">
                  <Button
                    color="primary"
                    onClick={() =>
                      saveKeys({
                        appId: newAppId,
                        publicKey: newPublicKey,
                        secretKey: newSecretKey,
                      })
                    }>
                    {t("save")}
                  </Button>
                </div>
              </form>
              <div>
                <p className="text-lgf mt-5 font-bold">Setup instructions</p>

                <ol className="ml-1 list-decimal pl-2">
                  {/* <Trans i18nKey="zapier_setup_instructions"> */}
                  <li>
                    Log into your Mercado Pago account and create a new app{" "}
                    <a
                      href="https://www.mercadopago.com.mx/developers/panel"
                      className="text-orange-600 underline">
                      {t("here")}
                    </a>
                    .
                  </li>
                  <li>Choose a name for your application.</li>
                  <li>Select Online payments solution.</li>
                  <li>Choose No for Using online platform.</li>
                  <li>CheckoutAPI as integration product.</li>
                  <li>Accept terms and Create APP</li>
                  <li>Go back to dashboard, click on new app and copy the credentials.</li>
                  <li>Paste them on the required field and save them.</li>
                  <li>You&apos;re all setup</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 ml-5">
          <div>Mercado Pago</div>
          <div className="mt-3">
            <Link href="/apps/mercado_pago" passHref={true} legacyBehavior>
              <Button>{t("go_to_app_store")}</Button>
            </Link>
          </div>
        </div>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
