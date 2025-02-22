"use client";

import Link from "next/link";
import { useState } from "react";

import { classNames } from "@calcom/lib";

import type { BadgeProps } from "../badge";
import { Badge } from "../badge";
import { Divider } from "../divider";
import { Input } from "../form/inputs/TextField";
import { Icon } from "../icon";

type Action = { check: () => boolean; fn: () => void };
export default function FormCard({
  children,
  label,
  isLabelEditable,
  onLabelChange,
  deleteField,
  moveUp,
  moveDown,
  className,
  badge,
  ...restProps
}: {
  children: React.ReactNode;
  label: string;
  isLabelEditable?: boolean;
  onLabelChange?: (label: string) => void;
  deleteField?: Action | null;
  moveUp?: Action | null;
  moveDown?: Action | null;
  className?: string;
  badge?: { text: string; href?: string; variant: BadgeProps["variant"] } | null;
} & JSX.IntrinsicElements["div"]) {
  className = classNames(
    className,
    "flex items-center group relative w-full rounded-md p-4 border border-subtle"
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleFormCard = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className={className} {...restProps}>
      <div>
        {moveUp?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible absolute left-0 -ml-[13px] -mt-10 flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 "
            onClick={() => moveUp?.fn()}>
            <Icon name="arrow-up" />
          </button>
        ) : null}
        {moveDown?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible absolute left-0 -ml-[13px] -mt-2  flex h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible group-hover:scale-100"
            onClick={() => moveDown?.fn()}>
            <Icon name="arrow-down" />
          </button>
        ) : null}
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            {isLabelEditable ? (
              <Input type="text" value={label} onChange={(e) => onLabelChange?.(e.target.value)} />
            ) : (
              <span className="text-emphasis text-sm font-semibold">{label}</span>
            )}
            {badge && (
              <Badge className="ml-2" variant={badge.variant}>
                {badge.href ? <Link href={badge.href}>{badge.text}</Link> : badge.text}
              </Badge>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                toggleFormCard();
              }}
              color="secondary">
              <Icon name="chevrons-down-up" className="text-default h-4 w-4" />
            </button>
            {deleteField?.check() ? (
              <button
                type="button"
                className="ml-2"
                onClick={() => {
                  deleteField?.fn();
                }}
                color="secondary">
                <Icon name="trash-2" className="text-default h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className={isCollapsed ? "hidden" : ""}>
          <Divider className="mb-6 mt-3" />
          {children}
        </div>
      </div>
    </div>
  );
}
