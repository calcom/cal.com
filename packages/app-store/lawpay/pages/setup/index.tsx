import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

export default function LawPaySetup() {
  const [newApiKey, setNewApiKey] = useState("");
  const [newMerchantId, setNewMerchantId] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.apps.integrations.useQuery({ variant: "payment", appId: "lawpay" });
  const [lawpayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = lawpayPaymentAppCredentials?.userCredentialIds || [-1];
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
              <img className="h-11" src="/api/app-store/lawpay/icon.svg" alt="LawPay Logo" />
              <p className="text-default mt-5 text-lg">LawPay</p>
            </div>
            <form autoComplete="off" className="mt-5">
              <div className="mb-4">
                <label className="text-default mb-2 block text-sm font-medium">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="border-default bg-default text-default focus:border-brand-500 focus:ring-brand-500 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm">
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <TextField
                label="API Key"
                type="password"
                name="api_key"
                id="api_key"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                role="presentation"
                autoComplete="new-password"
              />

              <TextField
                label="Merchant ID"
                type="text"
                name="merchant_id"
                id="merchant_id"
                value={newMerchantId}
                onChange={(e) => setNewMerchantId(e.target.value)}
                role="presentation"
              />

              {/* Button to submit */}
              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="secondary"
                  onClick={() => {
                    saveKeysMutation.mutate({
                      credentialId,
                      key: {
                        api_key: newApiKey,
                        merchant_id: newMerchantId,
                        environment: environment,
                      },
                    });
                  }}>
                  {t("save")}
                </Button>
              </div>
            </form>
            <div>
              <p className="text-lgf text-default mt-5 font-bold">Getting started with LawPay</p>
              <p className="text-default font-semi mt-2">
                LawPay is the leading payment solution designed specifically for legal professionals. Our
                integration allows you to accept payments securely while maintaining compliance with legal
                ethics requirements.
              </p>

              <p className="text-lgf text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" /> Important requirements:
              </p>
              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>LawPay merchant account</li>
                <li>API access enabled in your LawPay dashboard</li>
                <li>Compliance with ABA Model Rule 1.15 for trust accounting</li>
              </ul>

              <p className="text-default mb-2 mt-5 font-bold">Resources:</p>
              <a
                className="text-orange-600 underline"
                target="_blank"
                href="https://developers.affinipay.com">
                LawPay Developer Documentation: https://developers.affinipay.com
              </a>

              <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>
              <p className="text-default font-semi mt-2">
                Follow these steps to configure LawPay with your Cal.com account. Make sure you have an active
                LawPay merchant account before proceeding.
              </p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                <li>
                  Log into your LawPay merchant dashboard at{" "}
                  <a target="_blank" href="https://secure.lawpay.com" className="text-orange-600 underline">
                    secure.lawpay.com
                  </a>
                </li>
                <li>Navigate to Settings → API Access</li>
                <li>Generate a new API key or use an existing one</li>
                <li>Copy your Merchant ID from the account settings</li>
                <li>Choose your environment (Sandbox for testing, Production for live transactions)</li>
                <li>Paste the API key and Merchant ID in the fields above</li>
                <li>Click Save to complete the setup</li>
              </ol>

              <p className="text-default mt-5 inline-flex font-bold">
                <Icon name="shield-check" className="mr-2 mt-1 h-4 w-4" />
                Security & Compliance:
              </p>
              <p className="text-default mt-2">
                LawPay automatically handles trust account compliance and ensures all transactions meet legal
                ethics requirements. The integration uses secure, encrypted communication and maintains PCI
                DSS Level 1 compliance.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="lawpay" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
