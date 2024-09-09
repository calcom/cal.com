/// <reference types="react" />
type BaseTableProps = Omit<React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>, "border"> & Partial<Pick<HTMLTableElement, "align" | "border">>;
declare const BaseTable: ({ children, ...rest }: BaseTableProps) => JSX.Element;
export default BaseTable;
//# sourceMappingURL=BaseTable.d.ts.map