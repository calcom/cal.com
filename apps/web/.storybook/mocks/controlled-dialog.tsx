import type React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
};

export function Dialog({ children, name, clearQueryParamsOnClose, ...dialogProps }: DialogProps) {
  return <DialogPrimitive.Root {...dialogProps}>{children}</DialogPrimitive.Root>;
}
