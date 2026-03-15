import classNames from "@calcom/ui/classNames";
import * as Popover from "@radix-ui/react-popover";
import React from "react";
import { buttonClasses } from "../button";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";

export const AnimatedPopover = ({
  text,
  PrefixComponent,
  count,
  popoverTriggerClassNames,
  children,
  Trigger,
  defaultOpen,
  prefix,
}: {
  text: string;
  PrefixComponent?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  popoverTriggerClassNames?: string;
  Trigger?: React.ReactNode;
  defaultOpen?: boolean;
  prefix?: string;
}) => {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  const ref = React.useRef<HTMLButtonElement>(null);
  // calculate which alignment to open the popover with based on which half of the screen it's on (left or right)
  const [align, setAlign] = React.useState<"start" | "end">("start");

  React.useLayoutEffect(() => {
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
        <button
          ref={ref}
          className={classNames(
            buttonClasses({
              color: "secondary",
            }),
            popoverTriggerClassNames
          )}>
          {Trigger ? (
            Trigger
          ) : (
            <div className="max-w-36 flex items-center">
              <Tooltip content={prefix ? `${prefix}${text}` : text}>
                <div className="flex select-none items-center truncate font-medium leading-none">
                  {PrefixComponent ? PrefixComponent : null}
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
              <Icon
                name="chevron-down"
                className={classNames("ml-2 w-4 transition-transform duration-150", open && "rotate-180")}
              />
            </div>
          )}
        </button>
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
