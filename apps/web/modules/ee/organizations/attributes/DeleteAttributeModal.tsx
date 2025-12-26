import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateAttributesList } from "@calcom/web/app/(use-page-wrapper)/settings/organizations/(org-user-only)/members/actions";

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
      revalidateAttributesList();
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
