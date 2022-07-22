import { useState } from "react";
import { useMutation } from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { ButtonBaseProps } from "@calcom/ui/Button";
import { Dialog } from "@calcom/ui/Dialog";

import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";

export default function DisconnectIntegration(props: {
  /** Integration credential id */
  id: number;
  externalId?: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onOpenChange: (isOpen: boolean) => unknown | Promise<unknown>;
}) {
  const { id, externalId = "" } = props;
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  const mutation = trpc.useMutation("viewer.deleteCredential", {
    onSettled: async () => {
      await props.onOpenChange(modalOpen);
    },
    onSuccess: () => {
      showToast("Integration deleted successfully", "success");
      setModalOpen(false);
    },
    onError: () => {
      throw new Error("Something went wrong");
    },
  });

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={t("yes_remove_app")}
          cancelBtnText="Cancel"
          onConfirm={() => {
            mutation.mutate({ id, externalId });
          }}>
          {t("are_you_sure_you_want_to_remove_this_app")}
        </ConfirmationDialogContent>
      </Dialog>
      {props.render({
        onClick() {
          setModalOpen(true);
        },
        disabled: modalOpen,
        loading: mutation.isLoading,
      })}
    </>
  );
}
