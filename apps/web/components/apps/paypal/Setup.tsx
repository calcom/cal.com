import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { CircleAlertIcon } from "@coss/ui/icons";
import { showToast } from "@calcom/ui/components/toast";

export default function PayPalSetup() {
  const [newClientId, setNewClientId] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const router = useRouter();
  const { t } = useLocale();

  const integrations = trpc.viewer.apps.integrations.useQuery({
    variant: "payment",
    appId: "paypal",
  });

  const [paypalPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = paypalPaymentAppCredentials?.userCredentialIds || [-1];

  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const saveKeysMutation = trpc.viewer.apps.updateAppCredentials.useMutation({
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
              <img className="h-11" src="/api/app-store/paypal/icon.svg" alt={t("paypal_payment_logo")} />
              <p className="text-default mt-5 text-lg">{t("paypal")}</p>
            </div>

            <form autoComplete="off" className="mt-5">
              <TextField
                label={t("client_id")}
                type="text"
                name="client_id"
                id="client_id"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                role="presentation"
                className="mb-6"
              />

              <TextField
                label={t("secret_key")}
                type="password"
                name="access_token"
                id="access_token"
                value={newSecretKey}
                autoComplete="new-password"
                role="presentation"
                onChange={(e) => setNewSecretKey(e.target.value)}
              />

              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="primary"
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
              <p className="text-lgf text-default mt-5 font-bold">{t("paypal_getting_started")}</p>

              <p className="text-default font-semi mt-2">{t("paypal_description")}</p>

              <p className="text-lgf text-default mt-5 inline-flex font-bold">
                <CircleAlertIcon className="mr-2 mt-1 h-4 w-4" />
                {t("important_requirements")}
              </p>

              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>{t("paypal_business_account")}</li>
                <li>{t("paypal_developer_account")}</li>
              </ul>

              <p className="text-default mb-2 mt-5 font-bold">{t("resources")}</p>

              <a
                className="text-orange-600 underline"
                target="_blank"
                href="https://developer.paypal.com/api/rest/#link-getclientidandclientsecret"
                rel="noreferrer">
                {t("paypal_rest_setup_guide")}
              </a>

              <p className="text-lgf text-default mt-5 font-bold">{t("paypal_setup_instructions")}</p>

              <p className="text-default font-semi mt-2">{t("paypal_setup_note")}</p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                <li>
                  {t("paypal_step_1")}{" "}
                  <a
                    target="_blank"
                    href="https://developer.paypal.com/dashboard/applications/live"
                    className="text-orange-600 underline"
                    rel="noreferrer">
                    {t("here")}
                  </a>
                  .
                </li>

                <li>{t("paypal_step_2")}</li>
                <li>{t("paypal_step_3")}</li>

                <li>
                  {t("paypal_step_4_part_1")}{" "}
                  <a
                    className="text-orange-600 underline"
                    href="https://developer.paypal.com/dashboard/applications/live">
                    {t("dashboard")}
                  </a>
                  , {t("paypal_step_4_part_2")}
                </li>

                <li>{t("paypal_step_5")}</li>
                <li>{t("paypal_step_6")}</li>
                <li>{t("paypal_step_7")}</li>
              </ol>

              <p className="text-default mt-5 inline-flex font-bold">
                <CircleAlertIcon className="mr-2 mt-1 h-4 w-4" />
                {t("reminder")}:
              </p>

              <p className="text-default mt-2">{t("paypal_webhook_reminder")}</p>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="paypal" />
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
