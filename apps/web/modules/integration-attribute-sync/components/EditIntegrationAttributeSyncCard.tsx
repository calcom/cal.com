import type {
  IntegrationAttributeSync,
  ISyncFormData,
} from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import type { IIntegrationAttributeSyncCardProps } from "./IntegrationAttributeSyncCard";
import IntegrationAttributeSyncCard from "./IntegrationAttributeSyncCard";

type IEditIntegrationAttributeSyncCardProps = Pick<
  IIntegrationAttributeSyncCardProps,
  "credentialOptions" | "teamOptions" | "attributes" | "organizationId" | "attributeOptions"
> & {
  sync: IntegrationAttributeSync;
};

const EditIntegrationAttributeSyncCard = (props: IEditIntegrationAttributeSyncCardProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const updateMutation = trpc.viewer.attributeSync.updateAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast(t("attribute_sync_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.attributeSync.deleteAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast(t("attribute_sync_deleted_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: ISyncFormData) => {
    updateMutation.mutate({ ...data });
  };

  const onDelete = () => {
    deleteMutation.mutate({ id: props.sync.id });
  };

  return (
    <IntegrationAttributeSyncCard
      {...props}
      onSubmit={onSubmit}
      onDelete={onDelete}
      isSubmitting={updateMutation.isPending}
    />
  );
};

export default EditIntegrationAttributeSyncCard;
