import React from "react";

import classNames from "@calcom/lib/classNames";

type Props = { children: React.ReactNode; combined?: boolean; containerProps?: JSX.IntrinsicElements["div"] };

/**
 * Breakdown of Tailwind Magic below
 * [&_button]:border-l-0 [&_a]:border-l-0 -> Selects all buttons/a tags and applies a border left of 0
 * [&>*:first-child]:rounded-l-md [&>*:first-child]:border-l -> Selects the first child of the content
 * ounds the left side
 * [&>*:last-child]:rounded-r-md -> Selects the last child of the content and rounds the right side
 * We dont need to add border to the right as we never remove it
 */

export function ButtonGroup({ children, combined = false, containerProps }: Props) {
  return (
    <div
      {...containerProps}
      className={classNames(
        "flex",
        !combined
          ? "space-x-2 rtl:space-x-reverse"
          : "[&_button]:rounded-none [&_button]:ltr:border-l-0 rtl:[&_button]:border-r-0 ltr:[&>*:first-child]:rounded-l-md ltr:[&>*:first-child]:border-l rtl:[&>*:first-child]:rounded-r-md rtl:[&>*:first-child]:border-r [&_a]:rounded-none ltr:[&_a]:border-l-0 rtl:[&_a]:border-r-0 ltr:[&>*:last-child]:rounded-r-md rtl:[&>*:last-child]:rounded-l-md",
        containerProps?.className
      )}>
      {children}
    </div>
  );
}
