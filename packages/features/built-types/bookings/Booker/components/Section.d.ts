/// <reference types="react" />
import type { MotionProps } from "framer-motion";
import type { BookerAreas, BookerLayout } from "../types";
/**
 * Define what grid area a section should be in.
 * Value is either a string (in case it's always the same area), or an object
 * looking like:
 * {
 *  // Where default is the required default area.
 *  default: "calendar",
 *  // Any optional overrides for different layouts by their layout name.
 *  week_view: "main",
 * }
 */
type GridArea = BookerAreas | ({
    [key in BookerLayout]?: BookerAreas;
} & {
    default: BookerAreas;
});
/**
 * Small helper compnent that renders a booker section in a specific grid area.
 */
export declare const BookerSection: import("react").ForwardRefExoticComponent<{
    children: React.ReactNode;
    area: GridArea;
    visible?: boolean | undefined;
    className?: string | undefined;
} & MotionProps & import("react").RefAttributes<HTMLDivElement>>;
export {};
//# sourceMappingURL=Section.d.ts.map