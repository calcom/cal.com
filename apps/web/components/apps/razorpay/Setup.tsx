import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import type { IRazorpaySetupProps } from "@calcom/app-store/razorpay/pages/setup/_getServerSideProps";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

const CURRENCY_OPTIONS = [
  { label: "INR - Indian Rupee", value: "INR" },
  { label: "USD - US Dollar", value: "USD" },
  { label: "EUR - Euro", value: "EUR" },
  { label: "GBP - British Pound", value: "GBP" },
  { label: "AUD - Australian Dollar", value: "AUD" },
  { label: "CAD - Canadian Dollar", value: "CAD" },
];

export default function RazorpaySetup(props: IRazorpaySetupProps) {
  const [keyId, setKeyId] = useState(props.keyId || "");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState(props.webhookSecret || "");
  const [defaultCurrency, setDefaultCurrency] = useState(props.defaultCurrency || "INR");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.apps.integrations.useQuery({
    variant: "payment",
    appId: "razorpay",
  });

  const [razorpayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = razorpayPaymentAppCredentials?.userCredentialIds || [-1];
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
  const isFormValid = keyId.trim() !== "" && keySecret.trim() !== "" && defaultCurrency !== "";
  const handleSave = () => {
    if (!isFormValid) {
      showToast("Please fill all required fields", "error");
      return;
    }
    saveKeysMutation.mutate({
      credentialId,
      key: {
        key_id: keyId.trim(),
        key_secret: keySecret.trim(),
        webhook_secret: webhookSecret.trim() || undefined,
        default_currency: defaultCurrency.toLowerCase(),
      },
    });
  };
  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }
  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <div className="invisible md:visible">
              <Image
                className="h-11"
                src="/api/app-store/razorpay/icon.svg"
                alt="Razorpay Logo"
                width={44}
                height={44}
              />
              <p className="text-default mt-5 text-lg">Razorpay</p>
            </div>
            <form autoComplete="off" className="mt-5">
              <TextField
                label="Razorpay Key ID *"
                type="text"
                name="key_id"
                id="key_id"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="rzp_live_xxxxxxxxxxxxx"
                required
              />
              <TextField
                label="Razorpay Key Secret *"
                type="password"
                name="key_secret"
                id="key_secret"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder="Enter your secret key"
                autoComplete="new-password"
                required
              />
              <TextField
                label="Webhook Secret (Optional)"
                type="password"
                name="webhook_secret"
                id="webhook_secret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Enter webhook secret"
              />
              <div className="mt-4">
                <label className="text-default mb-2 block text-sm font-medium">Default Currency *</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="border-default bg-default text-default focus:border-brand block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-0">
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="primary"
                  disabled={!isFormValid || saveKeysMutation.isPending}
                  onClick={handleSave}>
                  {saveKeysMutation.isPending ? (
                    <>
                      <Icon name="loader" className="mr-2 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </form>
            <div>
              <p className="text-default mt-5 text-lg font-bold">Getting Started with Razorpay</p>
              <p className="text-default mt-2 font-medium">
                Razorpay is a payment gateway that allows you to accept payments from your customers in India.
                Configure your API keys to start accepting payments.
              </p>
              <p className="text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" />
                Important Requirements:
              </p>
              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>Active Razorpay account</li>
                <li>API keys from Razorpay Dashboard</li>
                <li>Webhook configured (optional but recommended)</li>
              </ul>
              <p className="text-default mb-2 mt-5 font-bold">Setup Instructions:</p>
              <ol className="text-default ml-1 mt-2 list-decimal pl-2">
                <li>
                  Log into your{" "}
                  <a
                    target="_blank"
                    href="https://dashboard.razorpay.com/"
                    className="text-blue-600 underline"
                    rel="noreferrer">
                    Razorpay Dashboard
                  </a>
                </li>
                <li>Go to Settings → API Keys</li>
                <li>Generate or use existing API keys (Key ID and Key Secret)</li>
                <li>
                  (Optional) Configure webhook at Settings → Webhooks with URL:{" "}
                  <code className="bg-subtle rounded px-1">{`${window.location.origin}/api/integrations/razorpay/webhook`}</code>
                </li>
                <li>
                  <strong>Select the following events:</strong>
                  <ul className="mb-2 mt-1 list-disc pl-4 text-sm">
                    <li>order.paid</li>
                    <li>payment.captured</li>
                    <li>payment.authorized</li>
                    <li>payment.failed</li>
                    <li>refund.processed</li>
                    <li>refund.failed</li>
                  </ul>
                </li>
                <li>Copy the webhook secret if configured</li>
                <li>Paste all credentials in the form above and save</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="razorpay" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
