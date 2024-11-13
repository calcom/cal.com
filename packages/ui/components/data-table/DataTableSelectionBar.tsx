"use client";

import type { Table } from "@tanstack/react-table";
import { forwardRef } from "react";

import { classNames } from "@calcom/lib";

import type { IconName } from "../icon";

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
        "bg-brand-default text-brand fixed bottom-4 left-1/2 flex w-fit -translate-x-1/2 transform items-center space-x-3 rounded-lg px-4 py-2",
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
