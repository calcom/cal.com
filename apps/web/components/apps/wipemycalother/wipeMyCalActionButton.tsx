import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "./confirmDialog";

interface IWipeMyCalActionButtonProps {
  className?: string;
  bookingsEmpty: boolean;
  bookingStatus: "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
}

const WipeMyCalActionButton = (props: IWipeMyCalActionButtonProps) => {
  const { className, bookingsEmpty, bookingStatus } = props;
  const [openDialog, setOpenDialog] = useState(false);
  const { isSuccess, isPending, data } = trpc.viewer.apps.integrations.useQuery({
    variant: "other",
    onlyInstalled: undefined,
  });

  if (bookingStatus !== "upcoming" || bookingsEmpty) {
    return <></>;
  }
  const wipeMyCalCredentials = data?.items.find((item: { type: string }) => item.type === "wipemycal_other");

  const [credentialId] = wipeMyCalCredentials?.userCredentialIds || [false];

  return (
    <>
      {data && isSuccess && !isPending && credentialId && (
        <div className={className}>
          <ConfirmDialog isOpenDialog={openDialog} setIsOpenDialog={setOpenDialog} />
          <Button color="primary" onClick={() => setOpenDialog(true)} data-testid="wipe-today-button">
            Wipe Today
          </Button>
        </div>
      )}
    </>
  );
};

export { WipeMyCalActionButton };
