import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type {
  IntegrationAttributeSync,
  ISyncFormData,
} from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import ApplyAttributeSyncDialog from "./ApplyAttributeSyncDialog";
import IntegrationAttributeSyncCard from "./IntegrationAttributeSyncCard";
import type { IIntegrationAttributeSyncCardProps } from "./IntegrationAttributeSyncCard";

type IEditIntegrationAttributeSyncCardProps = Pick<
  IIntegrationAttributeSyncCardProps,
  "credentialOptions" | "teamOptions" | "attributes" | "organizationId" | "attributeOptions"
> & {
  sync: IntegrationAttributeSync;
};

const EditIntegrationAttributeSyncCard = (props: IEditIntegrationAttributeSyncCardProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
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

  const handleApply = () => {
    setShowApplyDialog(true);
  };

  return (
    <>
      <IntegrationAttributeSyncCard
        {...props}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onApply={handleApply}
        isSubmitting={updateMutation.isPending}
      />
      <ApplyAttributeSyncDialog
        syncId={props.sync.id}
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
      />
    </>
  );
};

export default EditIntegrationAttributeSyncCard;
