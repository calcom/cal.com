import type { Table } from "@tanstack/react-table";
import type { Table as TableType } from "@tanstack/table-core/build/lib/types";
import { AnimatePresence, motion } from "framer-motion";
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
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 20 }}
          exit={{ opacity: 0, y: 0 }}
          style={{
            left: `40%`,
          }}
          className="fixed bottom-6 hidden max-w-[40%] gap-1 md:flex md:flex-col">
          {renderAboveSelection && renderAboveSelection(table)}
          <div className="bg-brand-default text-brand item-center hidden justify-between rounded-lg p-2 lg:flex">
            <div className="text-brand-subtle my-auto px-2">{numberOfSelectedRows} selected</div>
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
