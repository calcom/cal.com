import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

export default function PaystackSetup() {
  const [newPublicKey, setNewPublicKey] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const router = useRouter();
  const { t } = useLocale();

  const integrations = trpc.viewer.apps.integrations.useQuery({
    variant: "payment",
    appId: "paystack",
  });

  const [paystackCredentials] = integrations.data?.items || [];
  const [credentialId] = paystackCredentials?.userCredentialIds || [-1];

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
              <img className="h-11" src="/api/app-store/paystack/icon.svg" alt="Paystack" />
              <p className="text-default mt-5 text-lg">Paystack</p>
            </div>

            <form
              autoComplete="off"
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                saveKeysMutation.mutate({
                  credentialId,
                  key: {
                    public_key: newPublicKey,
                    secret_key: newSecretKey,
                  },
                });
              }}>
              <TextField
                label={t("paystack_public_key")}
                type="text"
                name="public_key"
                id="public_key"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                role="presentation"
                className="mb-6"
                placeholder="pk_test_xxxxxxxxx"
              />

              <TextField
                label={t("paystack_secret_key")}
                type="password"
                name="secret_key"
                id="secret_key"
                value={newSecretKey}
                autoComplete="new-password"
                role="presentation"
                onChange={(e) => setNewSecretKey(e.target.value)}
                placeholder="sk_test_xxxxxxxxx"
              />

              <div className="mt-5 flex flex-row justify-end">
                <Button
                  type="submit"
                  color="primary"
                  loading={saveKeysMutation.isPending}
                  disabled={!newPublicKey || !newSecretKey}>
                  {t("save")}
                </Button>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-default font-bold">{t("getting_started")}</p>
              <p className="text-default mt-2">
                {t("paystack_getting_started_description")}{" "}
                <a
                  className="text-blue-600 underline"
                  target="_blank"
                  href="https://dashboard.paystack.com/#/settings/developers"
                  rel="noreferrer">
                  {t("paystack_dashboard")}
                </a>
                .
              </p>

              <p className="text-default mt-4 font-bold">{t("paystack_webhook_setup")}</p>
              <p className="text-default mt-2">
                {t("paystack_webhook_setup_description")}
              </p>
              <code className="bg-subtle mt-2 block rounded p-2 text-sm">
                {typeof window !== "undefined" ? window.location.origin : "https://your-cal.com"}
                /api/integrations/paystack/webhook
              </code>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="paystack" />
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
