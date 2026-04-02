import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { Dialog as BaseDialog } from "@calcom/ui/components/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
};

enum DIALOG_STATE {
  // Dialog is there in the DOM but not visible.
  CLOSED = "CLOSED",
  // State from the time b/w the Dialog is dismissed and the time the "dialog" query param is removed from the URL.
  CLOSING = "CLOSING",
  // Dialog is visible.
  OPEN = "OPEN",
}

export function Dialog(props: DialogProps) {
  const isPlatform = useIsPlatform();
  return !isPlatform ? <ControlledDialog {...props} /> : <DialogPrimitive.Dialog {...props} />;
}

function ControlledDialog(props: DialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const newSearchParams = new URLSearchParams(searchParams.toString());
  const { children, name, ...dialogProps } = props;

  // only used if name is set
  const [dialogState, setDialogState] = useState(dialogProps.open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSED);
  const shouldOpenDialog = newSearchParams.get("dialog") === name;
  if (name) {
    const clearQueryParamsOnClose = ["dialog", ...(props.clearQueryParamsOnClose || [])];
    dialogProps.onOpenChange = (open) => {
      if (props.onOpenChange) {
        props.onOpenChange(open);
      }

      // toggles "dialog" query param
      if (open) {
        newSearchParams.set("dialog", name);
      } else {
        clearQueryParamsOnClose.forEach((queryParam) => {
          newSearchParams.delete(queryParam);
        });
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
      setDialogState(open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSING);
    };

    if (dialogState === DIALOG_STATE.CLOSED && shouldOpenDialog) {
      setDialogState(DIALOG_STATE.OPEN);
    }

    if (dialogState === DIALOG_STATE.CLOSING && !shouldOpenDialog) {
      setDialogState(DIALOG_STATE.CLOSED);
    }

    // allow overriding
    if (!("open" in dialogProps)) {
      dialogProps.open = dialogState === DIALOG_STATE.OPEN ? true : false;
    }
  }

  return <BaseDialog {...dialogProps}>{children}</BaseDialog>;
}
