import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@coss/ui/lib/utils";
import { Separator } from "@coss/ui/components/separator";

const groupVariants = cva(
  "flex w-fit *:focus-visible:z-10 has-[>[data-slot=group]]:gap-2 *:has-focus-visible:z-10",
  {
    defaultVariants: {
      orientation: "horizontal",
    },
    variants: {
      orientation: {
        horizontal:
          "*:not-first:before:-start-[0.5px] *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:before:-end-[0.5px] *:not-first:rounded-s-none *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:rounded-e-none *:not-first:border-s-0 *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:border-e-0 *:not-first:before:rounded-s-none *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:before:rounded-e-none *:after:absolute *:after:start-full *:after:h-full *:after:w-px *:pointer-coarse:after:min-w-auto",
        vertical:
          "*:not-first:before:-top-[0.5px] *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:before:-bottom-[0.5px] flex-col *:not-first:rounded-t-none *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:rounded-b-none *:not-first:border-t-0 *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:border-b-0 *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:before:hidden *:not-first:before:rounded-t-none *:not-nth-last-[1_of_:not(span[data-base-ui-focus-guard],span[data-base-ui-inert])]:before:rounded-b-none *:after:absolute *:after:top-full *:after:h-px *:pointer-coarse:after:min-h-auto *:after:w-full dark:*:last:before:hidden dark:*:first:before:block",
      },
    },
  },
);

function Group({
  className,
  orientation,
  children,
  ...props
}: {
  className?: string;
  orientation?: VariantProps<typeof groupVariants>["orientation"];
  children: React.ReactNode;
} & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(groupVariants({ orientation }), className)}
      data-orientation={orientation}
      data-slot="group"
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

function GroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn(
      "relative inline-flex items-center whitespace-nowrap rounded-lg border border-border bg-muted bg-clip-padding px-[calc(--spacing(3)-1px)] text-muted-foreground text-base sm:text-sm shadow-xs outline-none transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/64 dark:before:shadow-[0_-1px_--theme(--color-white/8%)] [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:-mx-0.5",
      className,
    ),
    "data-slot": "group-text",
  };
  return useRender({
    defaultTagName: "div",
    props: mergeProps(defaultProps, props),
    render,
  });
}

function GroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: {
  className?: string;
} & React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn(
        "[[data-slot=input-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&]:-translate-x-px pointer-events-none relative z-20 has-[+[data-slot=input-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*,+[data-slot=number-field]:focus-within]:translate-x-px has-[+[data-slot=input-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*,+[data-slot=number-field]:focus-within]:bg-ring [[data-slot=input-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&,[data-slot=number-field]:focus-within+&]:bg-ring",
        className,
      )}
      orientation={orientation}
      {...props}
    />
  );
}

export {
  Group,
  Group as ButtonGroup,
  GroupText,
  GroupText as ButtonGroupText,
  GroupSeparator,
  GroupSeparator as ButtonGroupSeparator,
  groupVariants,
};
