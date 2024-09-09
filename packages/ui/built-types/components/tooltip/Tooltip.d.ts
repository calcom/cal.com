import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";
export declare function Tooltip({ children, content, open, defaultOpen, onOpenChange, delayDuration, side, ...props }: {
    children: React.ReactNode;
    content: React.ReactNode;
    delayDuration?: number;
    open?: boolean;
    defaultOpen?: boolean;
    side?: "top" | "right" | "bottom" | "left";
    onOpenChange?: (open: boolean) => void;
} & TooltipPrimitive.TooltipContentProps): JSX.Element;
export default Tooltip;
//# sourceMappingURL=Tooltip.d.ts.map