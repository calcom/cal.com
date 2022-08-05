import React from "react";

import classNames from "@calcom/lib/classNames";

type Props = { children: React.ReactNode; combined?: boolean; containerProps?: JSX.IntrinsicElements["div"] };

export default function ButtonGroup({ children, combined = false, containerProps }: Props) {
  return (
    <div
      {...containerProps}
      className={classNames("flex", !combined && "space-x-2", containerProps?.className)}>
      {children}
    </div>
  );
}
