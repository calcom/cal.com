import React, { ReactElement, ReactNode } from "react";

export function FancyTable({
  children,
}: {
  children: ReactElement<ColumnProps> | ReactElement<ColumnProps>[];
}) {
  const columns = React.Children.toArray(children) as ReactElement<ColumnProps>[];
  const headings = columns.map((column) => column.props.variant);
  return (
    <table>
      <thead>
        <tr>
          {headings.map((heading) => (
            <th key={heading}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map((item) => {
          return <tr key={item.props.variant}>{item.props.children}</tr>;
        })}
      </tbody>
    </table>
  );
}

interface ColumnProps {
  variant: string;
  children: ReactNode;
}

export function VarientColumn({ children, variant }: ColumnProps) {
  return (
    <tr>
      <td>{children}</td>
    </tr>
  );
}
