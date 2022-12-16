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
  return (
    <Popover.Root onOpenChange={setOpen} modal={true}>
      <Popover.Trigger asChild>
        <div
          className="item-center  mb-2 flex h-9 justify-between whitespace-nowrap rounded-md border border-gray-300 py-2 px-3
          text-sm placeholder:text-gray-400 hover:cursor-pointer hover:border-gray-400
          focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <div className="max-w-36 flex">
            <div className="truncate ">
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
      <Popover.Content side="bottom" align="end" asChild>
        <div className="absolute z-50 mt-2 w-56 -translate-x-[228px] rounded-md bg-white  shadow-sm ring-1 ring-black ring-opacity-5 focus-within:outline-none">
          {children}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
