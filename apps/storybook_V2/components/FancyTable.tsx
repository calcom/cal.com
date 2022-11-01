import React, { ReactElement, ReactNode } from "react";

export function FancyTable({
  children,
}: {
  children: ReactElement<ColumnProps> | ReactElement<ColumnProps>[];
}) {
  const columns = React.Children.toArray(children) as ReactElement<ColumnProps>[];
  const headings = columns.map((column) => column.props.variant);
  return (
    <div className="grid auto-cols-max grid-flow-col">
      {headings.map((heading) => (
        <div className="bg-gray-200 p-2" key={heading}>
          {heading}
        </div>
      ))}
    </div>
  );
}

interface ColumnProps {
  variant: string;
  children: ReactNode;
}

export function VarientColumn({ children, variant }: ColumnProps) {
  return <div>{children}</div>;
}
