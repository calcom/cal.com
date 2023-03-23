import Link from "next/link";

import { classNames } from "@calcom/lib";
import { FiArrowDown, FiArrowUp, FiTrash } from "@calcom/ui/components/icon";

import { Badge, BadgeProps } from "../..";
import { Divider } from "../divider";

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
    "flex items-center group relative w-full rounded-md p-4 border border-gray-200"
  );

  return (
    <div className={className} {...restProps}>
      <div>
        {moveUp?.check() ? (
          <button
            type="button"
            className="invisible absolute left-0 -ml-[13px] -mt-10 flex h-6 w-6 scale-0 items-center justify-center rounded-md border   bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black  hover:shadow group-hover:visible group-hover:scale-100 "
            onClick={() => moveUp?.fn()}>
            <FiArrowUp />
          </button>
        ) : null}
        {moveDown?.check() ? (
          <button
            type="button"
            className="invisible absolute left-0 -ml-[13px] -mt-2 flex h-6 w-6  scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100"
            onClick={() => moveDown?.fn()}>
            <FiArrowDown />
          </button>
        ) : null}
      </div>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold leading-none">{label}</span>
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
              <FiTrash className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </div>
        <Divider className="mt-3 mb-6" />
        {children}
      </div>
    </div>
  );
}
