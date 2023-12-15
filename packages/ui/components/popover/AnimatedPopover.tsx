import * as Popover from "@radix-ui/react-popover";
import React from "react";

import { classNames } from "@calcom/lib";
import { Tooltip } from "@calcom/ui";

import { ChevronDown } from "../icon";

export const AnimatedPopover = ({
  text,
  count,
  popoverTriggerClassNames,
  children,
  Trigger,
  defaultOpen,
  prefix,
}: {
  text: string;
  count?: number;
  children: React.ReactNode;
  popoverTriggerClassNames?: string;
  Trigger?: React.ReactNode;
  defaultOpen?: boolean;
  prefix?: string;
}) => {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  const ref = React.useRef<HTMLDivElement>(null);
  // calculate which aligment to open the popover with based on which half of the screen it is on (left or right)
  const [align, setAlign] = React.useState<"start" | "end">("start");
  React.useEffect(() => {
    const handleResize = () => {
      const halfWidth = window.innerWidth / 2;
      const { x } = ref?.current?.getBoundingClientRect() || {
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
    <Popover.Root defaultOpen={defaultOpen} onOpenChange={setOpen} modal={true}>
      <Popover.Trigger asChild>
        <div
          ref={ref}
          className={classNames(
            "hover:border-emphasis border-default text-default hover:text-emphasis radix-state-open:border-emphasis radix-state-open:outline-none radix-state-open:ring-2 radix-state-open:ring-emphasis mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer",
            popoverTriggerClassNames
          )}>
          {Trigger ? (
            Trigger
          ) : (
            <div className="max-w-36 flex items-center">
              <Tooltip content={`${prefix}${text}`}>
                <div className="flex select-none truncate font-medium">
                  {prefix && <span className="text-subtle">{prefix}&nbsp;</span>}
                  {text}
                  {count && count > 0 && (
                    <div className="text-emphasis flex items-center justify-center rounded-full font-semibold">
                      <span>&nbsp;</span>
                      {count}
                    </div>
                  )}
                </div>
              </Tooltip>
              <ChevronDown
                className={classNames("ml-2 w-4 transition-transform duration-150", open && "rotate-180")}
              />
            </div>
          )}
        </div>
      </Popover.Trigger>
      <Popover.Content side="bottom" align={align} asChild>
        <div
          className={classNames(
            "bg-default border-subtle scroll-bar absolute z-50 mt-1 max-h-64 w-56 select-none overflow-y-auto rounded-md border py-[2px] shadow-md focus-within:outline-none",
            align === "end" && "-translate-x-[228px]"
          )}>
          {children}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
