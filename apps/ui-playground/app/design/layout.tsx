import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import { IconSprites } from "@calcom/ui/components/icon";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <TooltipProvider>{children}</TooltipProvider>
      <IconSprites />
    </div>
  );
}
