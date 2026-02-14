import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Meta } from "@calcom/ui/components/core";

import type { IKasperoPaySetupProps } from "./_getServerSideProps";

export default function KasperoPaySetup(props: IKasperoPaySetupProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [merchantId, setMerchantId] = useState(props.merchantId || "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const saveCredentials = trpc.viewer.appCredentialsByType.update.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/apps/kasperopay");
    },
    onError: (error) => {
      showToast(error.message || t("error_saving_credentials"), "error");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantId.startsWith("kpm_")) {
      showToast("Merchant ID must start with 'kpm_'", "error");
      return;
    }

    setIsLoading(true);
    
    try {
      await saveCredentials.mutateAsync({
        type: "kasperopay_payment",
        key: {
          merchant_id: merchantId,
          webhook_secret: webhookSecret || undefined,
        },
      });
    } catch (error) {
      console.error("Error saving credentials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-default flex h-screen">
      <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
        <Meta
          title="KasperoPay Setup"
          description="Connect your KasperoPay merchant account to accept Kaspa payments"
        />
        
        <div className="md:flex md:flex-row">
          <div className="invisible md:visible">
            <img
              className="h-11"
              src="/api/app-store/kasperopay/icon.svg"
              alt="KasperoPay"
            />
          </div>
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <p className="text-default mb-1 text-xl font-bold">KasperoPay</p>
            <p className="text-subtle mb-5 text-sm">
              Accept Kaspa cryptocurrency payments for your Cal.com bookings.
            </p>

            {props.merchantId && (
              <div className="bg-success-subtle text-success mb-4 rounded-md p-3 text-sm">
                ✓ Connected: {props.merchantId}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField
                label="Merchant ID"
                name="merchantId"
                placeholder="kpm_your_merchant_id"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                required
                hint="Get your merchant ID at kaspa-store.com/merchant"
              />

              <TextField
                label="Webhook Secret (optional)"
                name="webhookSecret"
                type="password"
                placeholder="Leave empty if not using webhooks"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                hint="Used to verify incoming webhook signatures"
              />

              <div className="mt-5 flex flex-row justify-end">
                <Button
                  type="button"
                  color="secondary"
                  onClick={() => router.push("/apps/kasperopay")}
                  className="mr-2"
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" loading={isLoading}>
                  {props.merchantId ? t("update") : t("save")}
                </Button>
              </div>
            </form>

            <div className="border-subtle mt-6 border-t pt-4">
              <p className="text-subtle text-xs">
                Don&apos;t have a KasperoPay account?{" "}
                <a
                  href="https://kaspa-store.com/merchant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emphasis underline"
                >
                  Sign up for free
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { getServerSideProps } from "./_getServerSideProps";
