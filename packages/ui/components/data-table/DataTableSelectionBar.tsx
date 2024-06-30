import type { Table } from "@tanstack/react-table";
import type { Table as TableType } from "@tanstack/table-core/build/lib/types";
import { AnimatePresence } from "framer-motion";
import { Fragment } from "react";

import type { IconName } from "../..";
import { Button } from "../button";

export type ActionItem<TData> =
  | {
      type: "action";
      label: string;
      onClick: () => void;
      icon?: IconName;
      needsXSelected?: number;
    }
  | {
      type: "render";
      render: (table: Table<TData>) => React.ReactNode;
      needsXSelected?: number;
    };

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  actions?: ActionItem<TData>[];
  renderAboveSelection?: (table: TableType<TData>) => React.ReactNode;
}

export function DataTableSelectionBar<TData>({
  table,
  actions,
  renderAboveSelection,
}: DataTableSelectionBarProps<TData>) {
  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;
  const isVisible = numberOfSelectedRows > 0;

  // Hacky left % to center
  const actionsVisible = actions?.filter((a) => {
    if (!a.needsXSelected) return true;
    return a.needsXSelected <= numberOfSelectedRows;
  });

  return (
    <AnimatePresence>
      {isVisible ? (
        <div className="fade-in fixed bottom-6 left-1/2 hidden -translate-x-1/2 gap-1 md:flex md:flex-col">
          {renderAboveSelection && renderAboveSelection(table)}
          <div className="bg-brand-default text-brand hidden items-center justify-between rounded-lg p-2 md:flex">
            <p className="text-brand-subtle w-full px-2 text-center leading-none">
              {numberOfSelectedRows} selected
            </p>
            {actionsVisible?.map((action, index) => {
              return (
                <Fragment key={index}>
                  {action.type === "action" ? (
                    <Button aria-label={action.label} onClick={action.onClick} StartIcon={action.icon}>
                      {action.label}
                    </Button>
                  ) : action.type === "render" ? (
                    action.render(table)
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
