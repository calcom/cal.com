import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import showToast from "@calcom/lib/notification";
import { ButtonBaseProps } from "@calcom/ui/Button";
import { Dialog } from "@calcom/ui/Dialog";

import DeleteStripeDialogContent from "@components/dialog/DeleteStripeDialogContent";

export default function DisconnectStripeIntegration(props: {
  /** Integration credential id */
  id: number;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onOpenChange: (isOpen: boolean) => unknown | Promise<unknown>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const mutation = useMutation(
    async (action: string) => {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        body: JSON.stringify({ id: props.id, action }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Something went wrong");
      }
      return res.json();
    },
    {
      async onSettled() {
        await props.onOpenChange(modalOpen);
      },
      onSuccess(data) {
        showToast(data.message, "success");
        setModalOpen(false);
      },
    }
  );
  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DeleteStripeDialogContent
          variety="warning"
          title="Disconnect Stripe Integration"
          cancelAllBookingsBtnText="Cancel all bookings"
          removeBtnText="Remove payment"
          cancelBtnText="Cancel"
          onConfirm={() => {
            mutation.mutate("cancel");
          }}
          onRemove={() => {
            mutation.mutate("remove");
          }}>
          If you have unpaid and unconfirmed bookings, you must choose to cancel them or remove the required
          payment field.
        </DeleteStripeDialogContent>
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
