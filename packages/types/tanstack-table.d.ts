import "@tanstack/react-table";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: {
      position: "left" | "right";
      gap?: number;
    };
    filterType?: "select" | "text";

    // `autoWidth` can make the column size dynamic,
    // allowing each row to have a different width based on its content.
    // As a result, scrolling may be flaky, unless the content size is consistent.
    autoWidth?: boolean;
  }
}
