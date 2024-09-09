import type { ComponentProps } from "react";
import BaseTable from "./BaseTable";
declare const Row: ({ children, multiple, ...rest }: {
    children: React.ReactNode;
    multiple?: boolean | undefined;
} & Omit<import("react").DetailedHTMLProps<import("react").TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>, "border"> & Partial<Pick<HTMLTableElement, "align" | "border">>) => JSX.Element;
export default Row;
//# sourceMappingURL=Row.d.ts.map