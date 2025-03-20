/* 
In this file we can edit all the Primitives from radix-ui/react-tooltip
when building atoms package this will automatically replace the TooltipPrimitives used in components from all over the monorepo
ensuring that we don't have issues with atoms.
*/
import * as TooltipPrimitives from "@radix-ui/react-tooltip-atoms";

const PortalAsFragment: React.FC<{ children: JSX.Element }> = ({ children }) => <>{children}</>;

export const Tooltip = TooltipPrimitives.Tooltip;
export const TooltipTrigger = TooltipPrimitives.TooltipTrigger;
export const TooltipContent = TooltipPrimitives.TooltipContent;
export const TooltipArrow = TooltipPrimitives.TooltipArrow;
export const TooltipProvider = TooltipPrimitives.TooltipProvider;
export const Portal = PortalAsFragment;
export const Trigger = TooltipPrimitives.Trigger;
export const Provider = TooltipPrimitives.Provider;
export const Content = TooltipPrimitives.Content;
export const Arrow = TooltipPrimitives.Arrow;
export const Root = TooltipPrimitives.Root;
export const createTooltipScope = TooltipPrimitives.createTooltipScope;
export const TooltipPortal = PortalAsFragment;
