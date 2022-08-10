import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";

import { ConfirmDialog } from "./confirmDialog";

interface IWipeMyCalActionButtonProps {
  bookingsEmpty: boolean;
  bookingStatus: "upcoming" | "recurring" | "past" | "cancelled";
}

const WipeMyCalActionButton = (props: IWipeMyCalActionButtonProps) => {
  const { bookingsEmpty, bookingStatus } = props;
  const [openDialog, setOpenDialog] = useState(false);
  const { isSuccess, isLoading, data } = trpc.useQuery([
    "viewer.integrations",
    { variant: "other", onlyInstalled: undefined },
  ]);

  if (bookingStatus !== "upcoming" || bookingsEmpty) {
    return <></>;
  }
  const wipeMyCalCredentials = data?.items.find((item: { type: string }) => item.type === "wipemycal_other");

  const [credentialId] = wipeMyCalCredentials?.credentialIds || [false];

  return (
    <div>
      {data && isSuccess && !isLoading && credentialId && (
        <>
          <ConfirmDialog isOpenDialog={openDialog} setIsOpenDialog={setOpenDialog} />
          <Button onClick={() => setOpenDialog(true)} data-testid="wipe-today-button">
            Wipe Today
          </Button>
        </>
      )}
    </div>
  );
};

export { WipeMyCalActionButton };
