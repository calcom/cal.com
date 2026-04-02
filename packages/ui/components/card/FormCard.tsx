"use client";

import classNames from "@calcom/ui/classNames";
import Link from "next/link";
import { useState } from "react";
import type { BadgeProps } from "../badge";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dropdown, DropdownItem, DropdownMenuContent, DropdownMenuTrigger } from "../dropdown";
import { Input } from "../form/inputs/TextField";
import type { IconName } from "../icon";
import { Icon } from "../icon";

type Action = { check: () => boolean; fn: () => void; color?: "destructive" | "minimal"; disabled?: boolean };

type FormCardActionsProps = {
  deleteField?: Action | null;
  duplicateField?: Action | null;
};

const FormCardActions = ({ deleteField, duplicateField }: FormCardActionsProps) => {
  type ActionItem = {
    label: string;
    icon: IconName;
    onClick: () => void;
    color: "destructive" | "minimal";
    disabled?: boolean;
  };

  const actions: ActionItem[] = [
    duplicateField?.fn && {
      label: "Duplicate",
      icon: "copy",
      onClick: () => duplicateField.fn(),
    },
    deleteField?.fn && {
      label: "Delete",
      icon: "trash",
      onClick: () => deleteField.fn(),
      color: deleteField.color ?? "minimal",
      disabled: deleteField.disabled,
    },
  ].filter((action): action is ActionItem => !!action);

  if (actions.length === 0) return null;

  // If only one action, show a single icon button
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <Button
        type="button"
        variant="icon"
        color={action.color || "minimal"}
        className="ml-2"
        onClick={action.onClick}
        StartIcon={action.icon}
        title={action.label}
        disabled={action.disabled}
      />
    );
  }

  // If multiple actions, show dropdown
  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="icon" color="minimal" className="ml-2">
          <Icon name="ellipsis" className="text-default h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {actions.map((action) => (
          <DropdownItem
            key={action.label}
            StartIcon={action.icon}
            onClick={(e) => {
              e.preventDefault();
              action.onClick();
            }}
            disabled={action.disabled}
            color={action.color}>
            {action.label}
          </DropdownItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};

export default function FormCard({
  children,
  label,
  isLabelEditable,
  onLabelChange,
  deleteField,
  duplicateField,
  moveUp,
  moveDown,
  className,
  badge,
  collapsible = true,
  leftIcon,
  customActions,
  ...restProps
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  isLabelEditable?: boolean;
  onLabelChange?: (label: string) => void;
  deleteField?: Action | null;
  duplicateField?: Action | null;
  moveUp?: Action | null;
  moveDown?: Action | null;
  className?: string;
  badge?: { text: string; href?: string; variant: BadgeProps["variant"] } | null;
  leftIcon?: IconName;
  collapsible?: boolean;
  customActions?: React.ReactNode;
} & JSX.IntrinsicElements["div"]) {
  className = classNames(
    "flex items-center group relative w-full rounded-2xl p-1 border border-subtle bg-cal-muted mb-2",
    className
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleFormCard = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className={className} {...restProps}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        {moveUp?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible -ml-2 mb-1 flex h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible group-hover:scale-100"
            onClick={() => moveUp?.fn()}>
            <Icon name="arrow-up" />
          </button>
        ) : null}
        {moveDown?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible -ml-2 flex h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible group-hover:scale-100"
            onClick={() => moveDown?.fn()}>
            <Icon name="arrow-down" />
          </button>
        ) : null}
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            {leftIcon && (
              <div className="text-subtle border-subtle rounded-lg border p-1.5">
                <Icon name={leftIcon} className="text-default h-4 w-4" />
              </div>
            )}
            {collapsible && (
              <Button
                size="sm"
                variant="icon"
                color="minimal"
                CustomStartIcon={
                  <Icon
                    name="chevron-up"
                    className={classNames(
                      "text-default h-4 w-4 transition-transform",
                      isCollapsed && "rotate-180"
                    )}
                  />
                }
                onClick={() => {
                  toggleFormCard();
                }}
                className="text-muted"
              />
            )}
            {typeof label === "string" ? (
              isLabelEditable ? (
                <Input type="text" value={label} onChange={(e) => onLabelChange?.(e.target.value)} />
              ) : (
                <span className="text-emphasis text-sm font-semibold">{label}</span>
              )
            ) : (
              label
            )}
            {badge && (
              <Badge className="ml-2" variant={badge.variant}>
                {badge.href ? <Link href={badge.href}>{badge.text}</Link> : badge.text}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {customActions}
            <FormCardActions deleteField={deleteField} duplicateField={duplicateField} />
          </div>
        </div>
        <div className={isCollapsed ? "hidden" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function FormCardBody({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-default border-default w-full gap-3 rounded-2xl border p-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
