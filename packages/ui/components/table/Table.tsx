import { classNames } from "@calcom/lib";

interface TableProps {
  children: React.ReactNode;
}

interface DynamicWidth {
  widthClassNames?: string;
}

const Header = ({ children }: TableProps) => (
  <thead className="rounded-md">
    <tr className="bg-gray-50">{children}</tr>
  </thead>
);

const ColumnTitle = ({ children, widthClassNames }: TableProps & DynamicWidth) => (
  <th
    scope="col"
    className={classNames(
      "p-3 text-left text-xs font-medium uppercase text-gray-500",
      !widthClassNames ? "w-auto" : widthClassNames
    )}>
    {children}
  </th>
);

const Body = ({ children }: TableProps) => (
  <tbody className="divide-y divide-gray-200 rounded-md">{children}</tbody>
);

const Row = ({ children }: TableProps) => <tr>{children}</tr>;

const Cell = ({ children, widthClassNames }: TableProps & DynamicWidth) => (
  <td
    className={classNames(
      "relative py-2 px-3 text-sm font-medium text-gray-900",
      !widthClassNames ? "w-auto" : widthClassNames
    )}>
    {children}
  </td>
);

export const Table = ({ children }: TableProps) => (
  <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
    <table className="w-full divide-y divide-gray-200 rounded-md">{children}</table>
  </div>
);

Table.Header = Header;
Table.ColumnTitle = ColumnTitle;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;
