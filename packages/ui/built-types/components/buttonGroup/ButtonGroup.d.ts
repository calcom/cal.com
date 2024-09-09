import React from "react";
type Props = {
    children: React.ReactNode;
    combined?: boolean;
    containerProps?: JSX.IntrinsicElements["div"];
};
/**
 * Breakdown of Tailwind Magic below
 * [&_button]:border-l-0 [&_a]:border-l-0 -> Selects all buttons/a tags and applies a border left of 0
 * [&>*:first-child]:rounded-l-md [&>*:first-child]:border-l -> Selects the first child of the content
 * ounds the left side
 * [&>*:last-child]:rounded-r-md -> Selects the last child of the content and rounds the right side
 * We dont need to add border to the right as we never remove it
 */
export declare function ButtonGroup({ children, combined, containerProps }: Props): JSX.Element;
export {};
//# sourceMappingURL=ButtonGroup.d.ts.map