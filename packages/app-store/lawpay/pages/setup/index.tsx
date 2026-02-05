import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { lawPayCredentialSchema } from "../../types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

export default function LawPaySetup() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.apps.integrations.useQuery({ variant: "payment", appId: "lawpay" });
  const [lawpayPaymentAppCredentials] = integrations.data?.items ?? [];
  const [credentialId] = lawpayPaymentAppCredentials?.userCredentialIds ?? [-1];
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

  const handleSave = () => {
    const parsed = lawPayCredentialSchema.safeParse({
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      public_key: publicKey.trim(),
      secret_key: secretKey.trim(),
      merchant_id: merchantId.trim(),
      environment,
    });
    if (!parsed.success) {
      showToast(t("all_fields_are_required"), "error");
      return;
    }
    saveKeysMutation.mutate({ credentialId, key: parsed.data });
  };

  const canSave =
    clientId.trim() &&
    clientSecret.trim() &&
    publicKey.trim() &&
    secretKey.trim() &&
    merchantId.trim();

  return (
    <div className="flex h-screen bg-default">
      {showContent ? (
        <div className="m-auto max-w-[43em] overflow-auto rounded border border-subtle bg-default pb-10 md:p-10">
          <div className="ml-2 md:ml-5 ltr:mr-2 rtl:ml-2">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/lawpay/icon.svg" alt="LawPay Logo" />
              <p className="mt-5 text-default text-lg">LawPay</p>
            </div>
            <form autoComplete="off" className="mt-5">
              <div className="mb-4">
                <label className="mb-2 block font-medium text-default text-sm">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}
                  className="block w-full rounded-md border border-default bg-default px-3 py-2 text-default shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm">
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <TextField
                label="Client ID"
                type="text"
                name="client_id"
                id="client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                role="presentation"
                autoComplete="off"
              />

              <TextField
                label="Client Secret"
                type="password"
                name="client_secret"
                id="client_secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                role="presentation"
                autoComplete="new-password"
              />

              <TextField
                label="Public Key"
                type="password"
                name="public_key"
                id="public_key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                role="presentation"
                autoComplete="off"
              />

              <TextField
                label="Secret Key (Webhook Signing)"
                type="password"
                name="secret_key"
                id="secret_key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                role="presentation"
                autoComplete="off"
              />

              <TextField
                label="Merchant ID"
                type="text"
                name="merchant_id"
                id="merchant_id"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                role="presentation"
                autoComplete="off"
              />

              <div className="mt-5 flex flex-row justify-end">
                <Button color="secondary" type="button" onClick={handleSave} disabled={!canSave}>
                  {t("save")}
                </Button>
              </div>
            </form>
            <div>
              <p className="mt-5 font-bold text-default text-lgf">Getting started with LawPay</p>
              <p className="mt-2 font-semi text-default">
                LawPay is the leading payment solution designed specifically for legal professionals. Our
                integration allows you to accept payments securely while maintaining compliance with legal
                ethics requirements.
              </p>

              <p className="mt-5 inline-flex font-bold text-default text-lgf">
                <Icon name="circle-alert" className="mt-1 mr-2 h-4 w-4" /> Important requirements:
              </p>
              <ul className="mt-2 ml-1 list-disc pl-2 text-default">
                <li>LawPay merchant account</li>
                <li>API access enabled in your LawPay dashboard</li>
                <li>Compliance with ABA Model Rule 1.15 for trust accounting</li>
              </ul>

              <p className="mt-5 mb-2 font-bold text-default">Resources:</p>
              <a
                className="text-orange-600 underline"
                target="_blank"
                href="https://developers.affinipay.com"
                rel="noopener">
                LawPay Developer Documentation: https://developers.affinipay.com
              </a>

              <p className="mt-5 font-bold text-default text-lgf">Setup instructions</p>
              <p className="mt-2 font-semi text-default">
                Follow these steps to configure LawPay with your Cal.com account. Make sure you have an active
                LawPay merchant account before proceeding.
              </p>

              <ol className="mt-5 ml-1 list-decimal pl-2 text-default">
                <li>
                  Log into your LawPay merchant dashboard at{" "}
                  <a
                    target="_blank"
                    href="https://secure.lawpay.com"
                    className="text-orange-600 underline"
                    rel="noopener">
                    secure.lawpay.com
                  </a>
                </li>
                <li>Navigate to Settings → API Access (or Developer / OAuth)</li>
                <li>Create or use an OAuth application and copy Client ID and Client Secret</li>
                <li>Copy your Merchant ID (account ID) from the account settings</li>
                <li>Obtain your Public Key and Secret Key (webhook signing secret) from the dashboard</li>
                <li>Choose your environment (Sandbox for testing, Production for live transactions)</li>
                <li>Paste all values in the fields above and click Save</li>
              </ol>

              <p className="mt-5 inline-flex font-bold text-default">
                <Icon name="shield-check" className="mt-1 mr-2 h-4 w-4" />
                Security & Compliance:
              </p>
              <p className="mt-2 text-default">
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
