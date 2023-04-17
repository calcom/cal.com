import Link from "next/link";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast } from "@calcom/ui";
import { Select } from "@calcom/ui";

export interface IMercadoPagoSetupProps {
  public_key: string;
  access_token: string;
  currency: string;
}

export default function MercadoPagoSetup(props: IMercadoPagoSetupProps) {
  const [newPublicKey, setNewPublicKey] = useState("");
  const [newAccessToken, setNewAccessToken] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState({ label: "", value: "" });

  const { t } = useLocale();

  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment" });

  const mercadoPagoCredentials: { credentialIds: number[] } | undefined = integrations.data?.items.find(
    (item: { type: string }) => item.type === "mercado_pago_payment"
  );

  const [credentialId] = mercadoPagoCredentials?.credentialIds || [false];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;
  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      // router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const saveKeys = async (key: {
    publicKey: string;
    accessToken: string;
    currency: { label: string; value: string };
  }) => {
    if (typeof credentialId !== "number") {
      return;
    }

    saveKeysMutation.mutate({
      credentialId,
      key: {
        public_key: key.publicKey,
        access_token: key.accessToken,
        currency: key.currency.value,
      },
    });

    return true;
  };

  if (integrations.isLoading) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  const currencyOptions = [
    { label: "MXN Peso Mexicano", value: "MXN" },
    { label: "CLP Peso Chileno", value: "CLP" },
    { label: "ARS Peso Argentino", value: "ARS" },
    { label: "BRL Real Brasilero", value: "BRL" },
    { label: "PEN Sol Peruano", value: "PEN" },
    { label: "COP Peso Colombiano", value: "COP" },
    { label: "UY Peso Uruguayo", value: "UYU" },
    { label: "VES Bolivar Venezolano", value: "VES" },
  ];

  return (
    <div className="flex h-screen bg-gray-200">
      {showContent ? (
        <div className="m-auto max-w-[43em] overflow-auto rounded bg-white pb-10 md:p-10">
          <div className="md:flex md:flex-row">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/mercado_pago/icon.svg" alt="Mercado Pago Logo" />
            </div>
            <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
              <p className="text-lg">Mercado Pago</p>
              <form autoComplete="off">
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="public_key">
                    Public key
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="public_key"
                      id="public_key"
                      className="block w-full rounded-md border-gray-300 text-black shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={newPublicKey}
                      autoComplete="new-password"
                      onChange={(e) => setNewPublicKey(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="access_token">
                    {t("access_token")}
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="access_token"
                      id="access_token"
                      className="block w-full rounded-md border-gray-300 text-black shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={newAccessToken}
                      autoComplete="new-password"
                      onChange={(e) => setNewAccessToken(e.target.value)}
                    />
                  </div>

                  <div className="mt-5">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="currency">
                      Currency
                    </label>
                    <Select
                      options={currencyOptions}
                      value={selectedCurrency}
                      className="text-black"
                      defaultValue={selectedCurrency?.value}
                      onChange={(e) => {
                        if (e) {
                          setSelectedCurrency(e);
                        }
                      }}
                    />
                  </div>
                </div>
                {/* Button to submit */}
                <div className="mt-5">
                  <Button
                    color="primary"
                    onClick={() =>
                      saveKeys({
                        publicKey: newPublicKey,
                        accessToken: newAccessToken,
                        currency: selectedCurrency,
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
