import "@tanstack/table-core";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: {
      position: "left" | "right";
      gap?: number;
    };
  }
}
