"use client";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { Dialog as BaseDialog } from "@calcom/ui/components/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
  isPlatform?: boolean;
};

enum DIALOG_STATE {
  CLOSED = "CLOSED",
  CLOSING = "CLOSING",
  OPEN = "OPEN",
}

export function Dialog(props: DialogProps) {
  const { isPlatform = false, ...rest } = props;

  // Simple mode for platform/atoms - no URL state management
  if (isPlatform) {
    return <DialogPrimitive.Root {...rest} />;
  }

  // URL-managed mode for web
  return <ControlledDialogInternal {...rest} />;
}

// Private - URL state management logic for web
// Will be exported as ControlledDialog in follow-up PR
function ControlledDialogInternal(props: Omit<DialogProps, "isPlatform">) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const { children, name, ...dialogProps } = props;

  const [dialogState, setDialogState] = useState(dialogProps.open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSED);

  const shouldOpenDialog = new URLSearchParams(searchParams.toString()).get("dialog") === name;

  useEffect(() => {
    if (!name) return;

    if (dialogState === DIALOG_STATE.CLOSED && shouldOpenDialog) {
      setDialogState(DIALOG_STATE.OPEN);
    }

    if (dialogState === DIALOG_STATE.CLOSING && !shouldOpenDialog) {
      setDialogState(DIALOG_STATE.CLOSED);
    }
  }, [name, dialogState, shouldOpenDialog]);

  if (name) {
    const clearQueryParamsOnClose = ["dialog", ...(props.clearQueryParamsOnClose || [])];

    dialogProps.onOpenChange = (open) => {
      if (props.onOpenChange) {
        props.onOpenChange(open);
      }

      const newSearchParams = new URLSearchParams(searchParams.toString());

      if (open) {
        newSearchParams.set("dialog", name);
        router.push(`${pathname}?${newSearchParams.toString()}`);
      } else {
        clearQueryParamsOnClose.forEach((queryParam) => {
          newSearchParams.delete(queryParam);
        });
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
      setDialogState(open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSING);
    };

    if (!("open" in dialogProps)) {
      dialogProps.open = dialogState === DIALOG_STATE.OPEN;
    }
  }

  return <BaseDialog {...dialogProps}>{children}</BaseDialog>;
}
