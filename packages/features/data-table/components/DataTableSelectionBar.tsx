"use client";

import type { Table } from "@tanstack/react-table";
import { forwardRef } from "react";

import { classNames } from "@calcom/lib";
import { Button, Icon } from "@calcom/ui";
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

type ResponsiveButtonProps = {
  className?: string;
  icon: IconName;
  onClick?: () => void;
  children: string;
};

const ResponsiveButton = forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  ({ className, icon, onClick, children }, ref) => {
    return (
      <Button ref={ref} onClick={onClick} title={children}>
        <Icon name={icon} size={18} className="sm:hidden" />
        <Icon name={icon} size={16} className="mr-2 hidden shrink-0 sm:inline" />
        <span className="sr-only shrink-0 md:not-sr-only">{children}</span>
      </Button>
    );
  }
);

ResponsiveButton.displayName = "ResponsiveButton";

const Root = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showSelectionCount?: boolean }
>(({ children, ...props }, ref) => {
  const { className, style, ...rest } = props;
  return (
    <div
      ref={ref}
      className={classNames(
        "bg-brand-default text-brand fixed bottom-0 left-0 z-40 flex w-full items-center space-x-1 overflow-x-auto px-2 py-2 sm:space-x-2 md:bottom-4 md:left-1/2 md:z-auto md:w-fit md:-translate-x-1/2 md:transform md:space-x-3 md:overflow-x-hidden md:rounded-lg md:px-4",
        className
      )}
      style={{ ...style }}
      {...rest}>
      {children}
    </div>
  );
});

Root.displayName = "Root";

export const DataTableSelectionBar = {
  Root,
  Button: ResponsiveButton,
};
