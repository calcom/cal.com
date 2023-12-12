import type { Table } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
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
  const isVisible = numberOfSelectedRows > 0;

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 20 }}
          exit={{ opacity: 0, y: 0 }}
          className="bg-brand-default text-brand item-center fixed bottom-6 left-1/4 hidden gap-4 rounded-lg p-2 md:flex lg:left-1/2">
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
