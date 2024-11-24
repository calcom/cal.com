import "@tanstack/react-table";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: {
      position: "left" | "right";
      gap?: number;
    };
    filterType?: "select" | "text";
  }
}
