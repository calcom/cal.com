import "@tanstack/react-table";

import type { ColumnFilterMeta } from "./data-table";

declare module "@tanstack/table-core" {
  interface ColumnMeta {
    filter?: ColumnFilterMeta;

    // `autoWidth` can make the column size dynamic,
    // allowing each row to have a different width based on its content.
    // As a result, scrolling may be flaky, unless the content size is consistent.
    autoWidth?: boolean;
  }
}
