import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { IntegrationAttributeSync } from "../repositories/IIntegrationAttributeSyncRepository";
import { ISyncFormData } from "../schemas/zod";
import IntegrationAttributeSyncCard from "./IntegrationAttributeSyncCard";
import type { IIntegrationAttributeSyncCardProps } from "./IntegrationAttributeSyncCard";

type IEditIntegrationAttributeSyncCardProps = Pick<
  IIntegrationAttributeSyncCardProps,
  "credentialOptions" | "teamOptions" | "attributes" | "organizationId"
> & {
  sync: IntegrationAttributeSync;
};

const EditIntegrationAttributeSyncCard = (props: IEditIntegrationAttributeSyncCardProps) => {
  const utils = trpc.useUtils();
  const updateMutation = trpc.viewer.attributeSync.updateAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast("Attribute sync updated successfully", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.attributeSync.deleteAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast("Attribute sync deleted successfully", "success");
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
