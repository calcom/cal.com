"use client";

import { LawPaySetupForm } from "@calcom/app-store/lawpay/pages/setup";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";
import { trpc } from "@calcom/trpc/react";
import { useRouter } from "next/navigation";

export default function LawPaySetup() {
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
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  return (
    <LawPaySetupForm
      showContent={showContent}
      isPending={integrations.isPending}
      isSaving={saveKeysMutation.isPending}
      onSave={(key) => saveKeysMutation.mutate({ credentialId, key })}
    />
  );
}
