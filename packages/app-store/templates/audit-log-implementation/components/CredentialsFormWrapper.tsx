import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import { useAppCredential } from "../context/CredentialContext";
import { CredentialsForm, FormAction } from "./CredentialsForm";

export const CredentialsFormWrapper = () => {
  const { form, credentialId } = useAppCredential();
  const { t } = useLocale();

  const updateAppCredentialsMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      form.reset(form.getValues());
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <CredentialsForm
      form={form}
      action={FormAction.UPDATE}
      credentialId={credentialId}
      onSubmit={updateAppCredentialsMutation.mutate}
    />
  );
};
