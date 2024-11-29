"use client";

import type { Table } from "@tanstack/react-table";
import { forwardRef } from "react";

import { classNames } from "@calcom/lib";
import type { IconName } from "@calcom/ui";

export type ActionItem<TData> =
  | {
      type: "action";
      label: string;
      onClick: () => void;
      icon?: IconName;
      needsXSelected?: number;
    }
  | {
      type: "render";
      render: (table: Table<TData>) => React.ReactNode;
      needsXSelected?: number;
    };

const Root = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showSelectionCount?: boolean }
>(({ children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={classNames(
        "bg-brand-default text-brand fixed bottom-0 left-0 z-40 flex w-full items-center space-x-1 overflow-x-auto px-2 py-2 sm:space-x-2 md:bottom-4 md:left-1/2 md:z-auto md:w-fit md:-translate-x-1/2 md:transform md:space-x-3 md:overflow-x-hidden md:rounded-lg md:px-4",
        props.className
      )}
      style={{ ...props.style }}
      {...props}>
      {children}
    </div>
  );
});

Root.displayName = "Root";

export const DataTableSelectionBar = {
  Root,
};
