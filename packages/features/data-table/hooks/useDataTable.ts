import { useContext } from "react";

import { DataTableContext } from "../lib/context";

export function useDataTable() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error("useDataTable must be used within a DataTableProvider");
  }
  return context;
}
