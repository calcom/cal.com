/// <reference types="react" />
import type { ColumnDef, Row, Table as TableType } from "@tanstack/react-table";
import type { ActionItem } from "./DataTableSelectionBar";
import type { FilterableItems } from "./DataTableToolbar";
export interface DataTableProps<TData, TValue> {
    tableContainerRef: React.RefObject<HTMLDivElement>;
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    onSearch?: (value: string) => void;
    filterableItems?: FilterableItems;
    selectionOptions?: ActionItem<TData>[];
    renderAboveSelection?: (table: TableType<TData>) => React.ReactNode;
    tableCTA?: React.ReactNode;
    isPending?: boolean;
    onRowMouseclick?: (row: Row<TData>) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement, UIEvent>) => void;
    CTA?: React.ReactNode;
    tableOverlay?: React.ReactNode;
    variant?: "default" | "compact";
    "data-testid"?: string;
}
export declare function DataTable<TData, TValue>({ columns, data, filterableItems, tableCTA, searchKey, selectionOptions, tableContainerRef, isPending, tableOverlay, variant, renderAboveSelection, 
/** This should only really be used if you dont have actions in a row. */
onSearch, onRowMouseclick, onScroll, ...rest }: DataTableProps<TData, TValue>): JSX.Element;
//# sourceMappingURL=index.d.ts.map