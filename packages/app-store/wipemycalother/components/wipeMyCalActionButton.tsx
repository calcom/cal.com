import { useState } from "react";

import Button from "@calcom/ui/Button";

import { ConfirmDialog } from "./confirmDialog";

interface IWipeMyCalActionButtonProps {
  trpc: any;
}

const WipeMyCalActionButton = (props: IWipeMyCalActionButtonProps) => {
  const { trpc } = props;
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <>
      <ConfirmDialog trpc={trpc} isOpenDialog={openDialog} setIsOpenDialog={setOpenDialog} />
      <Button onClick={() => setOpenDialog(true)}>Wipe Today</Button>
    </>
  );
};

export { WipeMyCalActionButton };
