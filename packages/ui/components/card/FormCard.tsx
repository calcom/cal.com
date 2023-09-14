import Link from "next/link";

import { classNames } from "@calcom/lib";

import type { BadgeProps } from "../..";
import { Badge } from "../..";
import { Divider } from "../divider";
import { ArrowDown, ArrowUp, Trash2 } from "../icon";

type Action = { check: () => boolean; fn: () => void };
export default function FormCard({
  children,
  label,
  deleteField,
  moveUp,
  moveDown,
  className,
  badge,
  ...restProps
}: {
  children: React.ReactNode;
  label?: React.ReactNode;
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

  return (
    <div className={className} {...restProps}>
      <div>
        {moveUp?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible absolute left-0 -ml-[13px] -mt-10 flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 "
            onClick={() => moveUp?.fn()}>
            <ArrowUp />
          </button>
        ) : null}
        {moveDown?.check() ? (
          <button
            type="button"
            className="bg-default text-muted hover:text-emphasis invisible absolute left-0 -ml-[13px] -mt-2  flex h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible group-hover:scale-100"
            onClick={() => moveDown?.fn()}>
            <ArrowDown />
          </button>
        ) : null}
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-emphasis text-sm font-semibold">{label}</span>
            {badge && (
              <Badge className="ml-2" variant={badge.variant}>
                {badge.href ? <Link href={badge.href}>{badge.text}</Link> : badge.text}
              </Badge>
            )}
          </div>
          {deleteField?.check() ? (
            <button
              type="button"
              onClick={() => {
                deleteField?.fn();
              }}
              color="secondary">
              <Trash2 className="text-default h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Divider className="mb-6 mt-3" />
        {children}
      </div>
    </div>
  );
}
