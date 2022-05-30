import React from "react";

type Props = { children: React.ReactNode; combined?: boolean };
//TODO: Combined
export default function ButtonGroup({ children, combined = false }: Props) {
  return <div className="flex space-x-2">{children}</div>;
}
