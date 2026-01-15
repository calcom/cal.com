export type SeparatorRow = {
  type: "separator";
  label: string;
  className?: string;
};

export type DataTableRow<TData> = TData | SeparatorRow;

export function isSeparatorRow<TData>(row: DataTableRow<TData>): row is SeparatorRow {
  return typeof row === "object" && row !== null && "type" in row && row.type === "separator";
}
