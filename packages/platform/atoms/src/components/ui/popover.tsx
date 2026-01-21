/*
In this file we can edit all the Primitives from radix-ui/react-popover
when building atoms package this will automatically replace the PopoverPrimitives used in components from all over the monorepo
ensuring that we don't have issues with atoms.
*/
import * as PopoverPrimitives from "@radix-ui/react-popover-atoms";

const Popover: typeof PopoverPrimitives.Root = PopoverPrimitives.Root;
const PopoverTrigger: typeof PopoverPrimitives.Trigger = PopoverPrimitives.Trigger;
const PopoverAnchor: typeof PopoverPrimitives.Anchor = PopoverPrimitives.Anchor;
const PopoverClose: typeof PopoverPrimitives.Close = PopoverPrimitives.Close;
const PopoverContent: typeof PopoverPrimitives.Content = PopoverPrimitives.Content;
const PopoverArrow: typeof PopoverPrimitives.Arrow = PopoverPrimitives.Arrow;

const PopoverPortal = ({ children, ...props }: PopoverPrimitives.PopoverPortalProps): JSX.Element => {
  return (
    <PopoverPrimitives.Portal {...props}>
      <div className="calcom-atoms">{children}</div>
    </PopoverPrimitives.Portal>
  );
};

export const Root: typeof PopoverPrimitives.Root = Popover;
export const Trigger: typeof PopoverPrimitives.Trigger = PopoverTrigger;
export const Anchor: typeof PopoverPrimitives.Anchor = PopoverAnchor;
export const Close: typeof PopoverPrimitives.Close = PopoverClose;
export const Portal: typeof PopoverPortal = PopoverPortal;
export const Content: typeof PopoverPrimitives.Content = PopoverContent;
export const Arrow: typeof PopoverPrimitives.Arrow = PopoverArrow;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose, PopoverPortal, PopoverArrow };
