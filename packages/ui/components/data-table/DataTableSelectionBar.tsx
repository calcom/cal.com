import type { Table } from "@tanstack/react-table";
import { Fragment } from "react";

import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Button } from "../button";

export type ActionItem<TData> =
  | {
      type: "action";
      label: string;
      onClick: () => void;
      icon?: SVGComponent;
    }
  | {
      type: "render";
      render: (table: Table<TData>) => React.ReactNode;
    };

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  actions?: ActionItem<TData>[];
}

export function DataTableSelectionBar<TData>({ table, actions }: DataTableSelectionBarProps<TData>) {
  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  if (numberOfSelectedRows === 0) return null;

  return (
    <div className="bg-brand-default text-brand item-center absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-4 rounded-lg p-2">
      <div className="text-brand-subtle my-auto px-2">{numberOfSelectedRows} selected</div>
      {actions?.map((action, index) => (
        <Fragment key={index}>
          {action.type === "action" ? (
            <Button aria-label={action.label} onClick={action.onClick} StartIcon={action.icon}>
              {action.label}
            </Button>
          ) : action.type === "render" ? (
            action.render(table)
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
