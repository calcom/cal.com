import type { ISyncFormData } from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import type { IIntegrationAttributeSyncCardProps } from "./IntegrationAttributeSyncCard";
import IntegrationAttributeSyncCard from "./IntegrationAttributeSyncCard";

type INewIntegrationAttributeSyncCardProps = Pick<
  IIntegrationAttributeSyncCardProps,
  "credentialOptions" | "teamOptions" | "attributes" | "organizationId" | "onCancel" | "attributeOptions"
>;

const NewIntegrationAttributeSyncCard = (props: INewIntegrationAttributeSyncCardProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const createMutation = trpc.viewer.attributeSync.createAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast(t("attribute_sync_created_successfully"), "success");
      props.onCancel?.();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: ISyncFormData) => {
    if (!data.credentialId) {
      showToast(t("attribute_sync_credential_required"), "error");
      return;
    }

    createMutation.mutate({
      name: data.name,
      credentialId: data.credentialId,
      rule: data.rule,
      syncFieldMappings: data.syncFieldMappings,
      enabled: data.enabled,
    });
  };
  return (
    <IntegrationAttributeSyncCard {...props} onSubmit={onSubmit} isSubmitting={createMutation.isPending} />
  );
};

export default NewIntegrationAttributeSyncCard;
