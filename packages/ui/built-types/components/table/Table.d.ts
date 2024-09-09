/// <reference types="react" />
interface TableProps {
    children: React.ReactNode;
}
interface DynamicWidth {
    widthClassNames?: string;
}
export declare const Table: {
    ({ children }: TableProps): JSX.Element;
    Header: ({ children }: TableProps) => JSX.Element;
    ColumnTitle: ({ children, widthClassNames }: TableProps & DynamicWidth) => JSX.Element;
    Body: ({ children }: TableProps) => JSX.Element;
    Row: ({ children }: TableProps) => JSX.Element;
    Cell: ({ children, widthClassNames }: TableProps & DynamicWidth) => JSX.Element;
};
export {};
//# sourceMappingURL=Table.d.ts.map