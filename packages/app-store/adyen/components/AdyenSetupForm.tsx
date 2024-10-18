import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Button, Divider, showToast, TextField } from "@calcom/ui";

import type { AdyenCredentialKeys } from "../zod";
import { adyenCredentialKeysSchema } from "../zod";

export default function AdyenSetupForm() {
  // const router = useRouter();
  const { t } = useLocale();

  const [newMerchantId, setNewMerchantId] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newClientKey, setNewClientKey] = useState("");
  const [newHmacKey, setNewHmacKey] = useState("");
  const { data } = trpc.viewer.appCredentialsByType.useQuery({
    appType: "adyen",
  });

  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  useEffect(() => {
    const appCredentials = data as RouterOutputs["viewer"]["appCredentialsByType"];
    const credentialSchemaParse = adyenCredentialKeysSchema.safeParse(appCredentials?.credentials[0].key);
    const adyenPaymentAppCredentials: Partial<AdyenCredentialKeys> = credentialSchemaParse.success
      ? { ...credentialSchemaParse.data }
      : {};

    if (adyenPaymentAppCredentials) {
      setNewMerchantId(adyenPaymentAppCredentials?.merchant_id ?? "");
      setNewApiKey(adyenPaymentAppCredentials?.api_key ?? "");
      setNewClientKey(adyenPaymentAppCredentials?.client_key ?? "");
      setNewHmacKey(adyenPaymentAppCredentials?.hmac_key ?? "");
    }
  }, [data]);

  return (
    <form autoComplete="off" className="mt-5 flex flex-col">
      <h3>Account Info</h3>
      <TextField
        label="Api Key"
        type="password"
        name="api_key"
        id="api_key"
        value={newApiKey}
        role="presentation"
        onChange={(e) => setNewApiKey(e.target.value)}
      />
      <TextField
        label="Client Key"
        type="password"
        name="access_token"
        id="access_token"
        value={newClientKey}
        autoComplete="new-password"
        role="presentation"
        onChange={(e) => setNewClientKey(e.target.value)}
      />
      <Divider />
      <h3>Webhook Authentication</h3>
      <TextField
        label="HMAC Key"
        type="password"
        name="hmac_key"
        id="hmac_key"
        value={newHmacKey}
        autoComplete="new-password"
        role="presentation"
        onChange={(e) => setNewHmacKey(e.target.value)}
      />
      <TextField
        label="Merchant Id"
        type="text"
        name="merchant_id"
        id="merchant_id"
        value={newMerchantId}
        autoComplete="new-password"
        role="presentation"
        onChange={(e) => setNewMerchantId(e.target.value)}
      />
      <div className="mt-5 flex flex-row justify-end">
        <Button
          color="secondary"
          onClick={() => {
            saveKeysMutation.mutate({
              credentialId: appCredentials.credentials[0].id,
              key: {
                api_key: newApiKey,
                client_key: newClientKey,
                merchant_id: newMerchantId,
                hmac_key: newHmacKey,
              },
            });
          }}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
