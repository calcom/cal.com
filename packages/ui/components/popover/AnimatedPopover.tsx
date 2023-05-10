import * as Popover from "@radix-ui/react-popover";
import React from "react";

import { classNames } from "@calcom/lib";
import { Tooltip } from "@calcom/ui";

import { ChevronDown } from "../icon";

export const AnimatedPopover = ({
  text,
  count,
  children,
}: {
  text: string;
  count?: number;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  // calculate which aligment to open the popover with based on which half of the screen it is on (left or right)
  const [align, setAlign] = React.useState<"start" | "end">("start");
  React.useEffect(() => {
    const handleResize = () => {
      const halfWidth = window.innerWidth / 2;
      const { x, y } = ref?.current?.getBoundingClientRect() || {
        x: 0,
        y: 0,
      };
      if (x > halfWidth) {
        setAlign("end");
      } else {
        setAlign("start");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setAlign]);

  return (
    <Popover.Root onOpenChange={setOpen} modal={true}>
      <Popover.Trigger asChild>
        <div
          ref={ref}
          className="hover:border-emphasis border-default text-default hover:text-emphasis mb-2 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <div className="max-w-36 flex items-center">
            <Tooltip content={text}>
              <div className="truncate">
                {text}
                {count && count > 0 && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full">{count}</div>
                )}
              </div>
            </Tooltip>
            <ChevronDown
              className={classNames("ml-2 transition-transform duration-150", open && "rotate-180")}
            />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Content side="bottom" align={align} asChild>
        <div
          className={classNames(
            "bg-default border-default absolute z-50 mt-2 max-h-64 w-56 overflow-y-scroll rounded-md border py-[2px] shadow-sm focus-within:outline-none",
            align === "end" && "-translate-x-[228px]"
          )}>
          {children}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
