import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

export function EventTypeTooltip({
  trigger,
  content,
}: {
  trigger: ReactNode | string;
  content: ReactNode | string;
}) {
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
