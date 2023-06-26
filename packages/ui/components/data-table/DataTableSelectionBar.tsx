import type { Table } from "@tanstack/react-table";

import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Button } from "../button";

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  actions?: {
    label: string;
    onClick: () => void;
    icon?: SVGComponent;
  }[];
}

export function DataTableSelectionBar<TData>({ table, actions }: DataTableSelectionBarProps<TData>) {
  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  if (numberOfSelectedRows === 0) return null;

  return (
    <div className="bg-brand-default text-brand item-center absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-4 rounded-lg p-2">
      <div className="text-brand-subtle my-auto px-2">{numberOfSelectedRows} selected</div>
      {actions?.map((action) => (
        <Button aria-label={action.label} onClick={action.onClick} StartIcon={action.icon} key={action.label}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
