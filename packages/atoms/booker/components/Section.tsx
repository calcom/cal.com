import { m } from "framer-motion";

import { classNames } from "@calcom/lib";

import { useBookerStore } from "../store";
import { BookerAreas, BookerLayout, BookerState } from "../types";

type GridArea =
  | BookerAreas
  // First value in array is default value
  | [
      BookerAreas,
      ...Array<
        | { area: BookerAreas; layout: BookerLayout; state: BookerState }
        | { area: BookerAreas; state: BookerState }
        | { area: BookerAreas; layout: BookerLayout }
      >
    ];

type BookerSectionProps = {
  children: React.ReactNode;
  area: GridArea;
  visible?: boolean;
  className?: string;
} & React.PropsWithoutRef<m.div>;

// This map with strings is needed so Tailwind generates all classnames,
// If we would concatenate them with JS, Tailwind would not generate them.
const gridAreaClassNameMap: { [key in BookerAreas]: string } = {
  calendar: "[grid-area:calendar]",
  main: "[grid-area:main]",
  meta: "[grid-area:meta]",
  timeslots: "[grid-area:timeslots]",
};

export const BookerSection = ({ children, area, visible, className, ...props }: BookerSectionProps) => {
  const layout = useBookerStore((state) => state.layout);
  const state = useBookerStore((state) => state.state);
  let gridClassName: string;

  if (!Array.isArray(area)) {
    gridClassName = gridAreaClassNameMap[area];
  } else {
    const [defaultArea, ...areas] = area;
    const match = areas.find(
      (item) =>
        (!("layout" in item) || item.layout === layout) && (!("state" in item) || item.state === state)
    );
    gridClassName = gridAreaClassNameMap[match?.area || defaultArea];
  }

  if (!visible) return null;

  return (
    <m.div className={classNames(gridClassName, className)} layout {...props}>
      {children}
    </m.div>
  );
};
