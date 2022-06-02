import { useState } from "react";

import Button from "@calcom/ui/Button";

import { ConfirmDialog } from "./confirmDialog";

interface IWipeMyCalActionButtonProps {
  trpc: any;
  bookingsEmpty: boolean;
  bookingStatus: "upcoming" | "recurring" | "past" | "cancelled";
}

const WipeMyCalActionButton = (props: IWipeMyCalActionButtonProps) => {
  const { trpc, bookingsEmpty, bookingStatus } = props;
  const [openDialog, setOpenDialog] = useState(false);
  const { isSuccess, isLoading, data } = trpc.useQuery([
    "viewer.integrations",
    { variant: "other", onlyInstalled: undefined },
  ]);

  if (bookingStatus !== "upcoming" || bookingsEmpty) {
    return <></>;
  }
  const wipeMyCalCredentials: { credentialIds: number[] } = data?.items.find(
    (item: { type: string }) => item.type === "wipemycal_other"
  );

  const [credentialId] = wipeMyCalCredentials?.credentialIds || [false];

  return (
    <div>
      {data && isSuccess && !isLoading && credentialId && (
        <>
          <ConfirmDialog trpc={trpc} isOpenDialog={openDialog} setIsOpenDialog={setOpenDialog} />
          <Button onClick={() => setOpenDialog(true)}>Wipe Today</Button>
        </>
      )}
    </div>
  );
};

export { WipeMyCalActionButton };
