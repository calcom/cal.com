import * as Popover from "@radix-ui/react-popover";
import React from "react";

import { classNames } from "@calcom/lib";
import { Icon } from "@calcom/ui";

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
          className="item-center  mb-2 flex h-9 max-h-72 justify-between overflow-y-scroll whitespace-nowrap rounded-md border border-gray-300
          py-2 px-3 text-sm placeholder:text-gray-400
          hover:cursor-pointer hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <div className="max-w-36 flex items-center">
            <div className="truncate">
              {text}
              {count && count > 0 && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full">{count}</div>
              )}
            </div>
            <Icon.FiChevronDown
              className={classNames("mt-auto ml-2 transition-transform duration-150", open && "rotate-180")}
            />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Content side="bottom" align={align} asChild>
        <div
          className={classNames(
            "absolute z-50 mt-2 w-56  rounded-md bg-white  py-[2px] shadow-sm ring-1 ring-black ring-opacity-5 focus-within:outline-none",
            align === "end" && "-translate-x-[228px]"
          )}>
          {children}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
