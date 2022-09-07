import React from "react";

import classNames from "@calcom/lib/classNames";

type Props = { children: React.ReactNode; combined?: boolean; containerProps?: JSX.IntrinsicElements["div"] };

export default function ButtonGroup({ children, combined = false, containerProps }: Props) {
  return (
    <div
      {...containerProps}
      className={classNames(
        "flex",
        !combined
          ? "space-x-2"
          : "[&_button]:border-l-0 [&>*:first-child]:rounded-l-md [&>*:first-child]:border-l [&_a]:border-l-0  [&>*:last-child]:rounded-r-md",
        containerProps?.className
      )}>
      {children}
    </div>
  );
}
