import "@tanstack/react-table";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    hasPermissions?: (data?: TData) => boolean; // We can conditionally render a column based on this callback -> User doesnt have admin for example.
  }
}
