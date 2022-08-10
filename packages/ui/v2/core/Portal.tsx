import * as RPortal from "@radix-ui/react-portal";
import { ReactNode } from "react";

export const Portal = ({ children, asChild }: { children: ReactNode; asChild?: boolean }) => (
  <RPortal.Root asChild={asChild}>{children}</RPortal.Root>
);
