/// <reference types="react" />
import type { Table } from "@tanstack/react-table";
import type { Table as TableType } from "@tanstack/table-core/build/lib/types";
import type { IconName } from "../..";
export type ActionItem<TData> = {
    type: "action";
    label: string;
    onClick: () => void;
    icon?: IconName;
    needsXSelected?: number;
} | {
    type: "render";
    render: (table: Table<TData>) => React.ReactNode;
    needsXSelected?: number;
};
interface DataTableSelectionBarProps<TData> {
    table: Table<TData>;
    actions?: ActionItem<TData>[];
    renderAboveSelection?: (table: TableType<TData>) => React.ReactNode;
}
export declare function DataTableSelectionBar<TData>({ table, actions, renderAboveSelection, }: DataTableSelectionBarProps<TData>): JSX.Element;
export {};
//# sourceMappingURL=DataTableSelectionBar.d.ts.map