import "@tanstack/react-table";

import type { ColumnFilterMeta } from "@calcom/features/data-table";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: {
      position: "left" | "right";
      gap?: number;
    };
    filter?: ColumnFilterMeta;
  }
}
