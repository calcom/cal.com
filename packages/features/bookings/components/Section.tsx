import type { MotionProps } from "framer-motion";
import { m } from "framer-motion";
import type { JSX, Ref } from "react";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import classNames from "@calcom/ui/classNames";

import type { BookerAreas, BookerLayout } from "@calcom/features/bookings/Booker/types";

type GridArea = BookerAreas | ({ [key in BookerLayout]?: BookerAreas } & { default: BookerAreas });

type BookerSectionProps = {
  children: React.ReactNode;
  area: GridArea;
  visible?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
} & MotionProps;

const gridAreaClassNameMap: { [key in BookerAreas]: string } = {
  calendar: "[grid-area:calendar]",
  main: "[grid-area:main]",
  meta: "[grid-area:meta]",
  timeslots: "[grid-area:timeslots]",
  header: "[grid-area:header]",
};

export const BookerSection = ({
  children,
  area,
  visible,
  className,
  ref,
  ...props
}: BookerSectionProps): JSX.Element | null => {
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
};
