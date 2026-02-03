import type { MotionProps } from "framer-motion";
import { m } from "framer-motion";
import { forwardRef } from "react";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import classNames from "@calcom/ui/classNames";

import type { BookerAreas, BookerLayout } from "@calcom/features/bookings/Booker/types";

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
type GridArea = BookerAreas | ({ [key in BookerLayout]?: BookerAreas } & { default: BookerAreas });

type BookerSectionProps = {
  children: React.ReactNode;
  area: GridArea;
  visible?: boolean;
  className?: string;
} & MotionProps;

// This map with strings is needed so Tailwind generates all classnames,
// If we would concatenate them with JS, Tailwind would not generate them.
const gridAreaClassNameMap: { [key in BookerAreas]: string } = {
  calendar: "[grid-area:calendar]",
  main: "[grid-area:main]",
  meta: "[grid-area:meta]",
  timeslots: "[grid-area:timeslots]",
  header: "[grid-area:header]",
};

/**
 * Small helper component that renders a booker section in a specific grid area.
 */
export const BookerSection = forwardRef<HTMLDivElement, BookerSectionProps>(function BookerSection(
  { children, area, visible, className, ...props },
  ref
) {
  const layout = useBookerStoreContext((state) => state.layout);
  let gridClassName: string;

  if (typeof area === "string") {
    gridClassName = gridAreaClassNameMap[area];
  } else {
    gridClassName = gridAreaClassNameMap[area[layout] || area.default];
  }

  if (!visible && typeof visible !== "undefined") return null;

  return (
    <m.div ref={ref} className={classNames(gridClassName, className)} layout {...props}>
      {children}
    </m.div>
  );
});
