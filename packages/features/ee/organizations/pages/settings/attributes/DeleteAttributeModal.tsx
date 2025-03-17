import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Dialog, ConfirmationDialogContent, showToast } from "@calcom/ui";

type AttributeItemProps = RouterOutputs["viewer"]["attributes"]["list"][number];

export function DeleteAttributeModal({
  attributeToDelete,
  setAttributeToDelete,
}: {
  attributeToDelete: AttributeItemProps;
  setAttributeToDelete: Dispatch<SetStateAction<AttributeItemProps | undefined>>;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.viewer.attributes.delete.useMutation({
    onSuccess: () => {
      showToast(t("attribute_deleted_successfully"), "success");
      utils.viewer.attributes.list.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <Dialog open={true} onOpenChange={() => setAttributeToDelete(undefined)}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_attribute")}
        confirmBtnText={t("confirm_remove_attribute")}
        onConfirm={() => {
          deleteMutation.mutate({
            id: attributeToDelete.id,
          });
        }}>
        {t("remove_attribute_confirmation_message", {
          name: attributeToDelete.name,
        })}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
