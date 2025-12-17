import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { ISyncFormData } from "../schemas/zod";
import IntegrationAttributeSyncCard from "./IntegrationAttributeSyncCard";
import type { IIntegrationAttributeSyncCardProps } from "./IntegrationAttributeSyncCard";

type INewIntegrationAttributeSyncCardProps = Pick<
  IIntegrationAttributeSyncCardProps,
  "credentialOptions" | "teamOptions" | "attributes" | "organizationId" | "onCancel"
>;

const NewIntegrationAttributeSyncCard = (props: INewIntegrationAttributeSyncCardProps) => {
  const utils = trpc.useUtils();
  const createMutation = trpc.viewer.attributeSync.createAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast("Attribute sync created successfully", "success");
      props.onCancel?.();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: ISyncFormData) => {
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
