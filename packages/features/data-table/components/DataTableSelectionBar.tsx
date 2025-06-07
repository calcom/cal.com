"use client";

import type { Table } from "@tanstack/react-table";
import React from "react";
import { createPortal } from "react-dom";

import classNames from "@calcom/ui/classNames";
import { Button, type ButtonProps } from "@calcom/ui/components/button";
import { Icon, type IconName } from "@calcom/ui/components/icon";

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
} & ButtonProps;

const ResponsiveButton = function ResponsiveButton({
  ref: forwardedRef,
  icon,
  onClick,
  children,
  ...rest
}: ResponsiveButtonProps & {
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button ref={forwardedRef} onClick={onClick} title={children} {...rest}>
      <Icon name={icon} size={18} className="sm:hidden" />
      <Icon name={icon} size={16} className="mr-2 hidden shrink-0 sm:inline" />
      <span className="sr-only shrink-0 md:not-sr-only">{children}</span>
    </Button>
  );
};

ResponsiveButton.displayName = "ResponsiveButton";

const Root = function Root({
  ref: forwardedRef,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showSelectionCount?: boolean } & {
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { className, style, ...rest } = props;
  return createPortal(
    <div
      ref={forwardedRef}
      className={classNames(
        "bg-default text-emphasis shadow-outline-gray-rested border-subtle fixed left-0 right-0 flex items-center space-x-1 overflow-x-auto border px-2 py-2 sm:space-x-2 md:left-1/2 md:z-auto md:w-fit md:-translate-x-1/2 md:transform md:space-x-3 md:overflow-x-hidden md:rounded-lg md:px-4",
        className
      )}
      style={{ ...style }}
      {...rest}>
      {children}
    </div>,
    document.body
  );
};

Root.displayName = "Root";

export const DataTableSelectionBar = {
  Root,
  Button: ResponsiveButton,
};
