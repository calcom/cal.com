import React from "react";

import classNames from "@calcom/lib/classNames";

type Props = { children: React.ReactNode; combined?: boolean };

export default function ButtonGroup({ children, combined = false }: Props) {
  return (
    <div className={classNames("flex", combined ? " last:rounded-r-none last:rounded-l-none" : "space-x-2")}>
      {children}
    </div>
  );
}
