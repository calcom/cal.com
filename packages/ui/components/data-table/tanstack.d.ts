import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: boolean;
    stickyLeft?: number;
  }
}
