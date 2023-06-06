import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, ButtonGroup, ToggleGroup } from "@calcom/ui";
import { Calendar, Columns, Grid } from "@calcom/ui/components/icon";

import { TimeFormatToggle } from "../../components/TimeFormatToggle";
import { useBookerStore } from "../store";
import type { BookerLayout } from "../types";

export function Header({ extraDays, isMobile }: { extraDays: number; isMobile: boolean }) {
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  const selectedDateString = useBookerStore((state) => state.selectedDate);
  const addToSelectedDate = useBookerStore((state) => state.addToSelectedDate);
  const isSmallCalendar = layout === "small_calendar";
  const selectedDate = dayjs(selectedDateString);

  const onLayoutToggle = useCallback(
    (newLayout: string) => setLayout(newLayout as BookerLayout),
    [setLayout]
  );

  if (isMobile) return null;

  // In month view we only show the layout toggle.
  if (isSmallCalendar) {
    return (
      <div className="fixed top-3 right-3 z-10">
        <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} />
      </div>
    );
  }

  return (
    <div className="border-subtle relative z-10 flex border-l border-b p-4">
      <div className="flex items-center gap-3">
        <h3 className="min-w-[150px] text-base font-semibold leading-4">
          {selectedDate.format("MMM D")}-{selectedDate.add(extraDays, "days").format("D")},{" "}
          <span className="text-subtle">{selectedDate.format("YYYY")}</span>
        </h3>
        <ButtonGroup>
          <Button
            variant="icon"
            color="minimal"
            StartIcon={ChevronLeft}
            aria-label="Previous Day"
            onClick={() => addToSelectedDate(-extraDays - 1)}
          />
          <Button
            variant="icon"
            color="minimal"
            StartIcon={ChevronRight}
            aria-label="Next Day"
            onClick={() => addToSelectedDate(extraDays + 1)}
          />
        </ButtonGroup>
      </div>
      <div className="ml-auto flex gap-3">
        <TimeFormatToggle />
        <div className="fixed top-4 right-4">
          <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} />
        </div>
        {/*
          This second layout toggle is hidden, but needed to reserve the correct spot in the DIV
          for the fixed toggle above to fit into. If we wouldn't make it fixed in this view, the transition
          would be really weird, because the element is positioned fixed in the month view, and then
          when switching layouts wouldn't anymmore, causing it to animate from the center to the top right,
          while it actuall already was on place. That's why we have this element twice.
        */}
        <div className="pointer-events-none opacity-0" aria-hidden>
          <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} />
        </div>
      </div>
    </div>
  );
}

const LayoutToggle = ({
  onLayoutToggle,
  layout,
}: {
  onLayoutToggle: (layout: string) => void;
  layout: string;
}) => {
  const { t } = useLocale();

  return (
    <ToggleGroup
      onValueChange={onLayoutToggle}
      defaultValue={layout}
      options={[
        {
          value: "small_calendar",
          label: <Calendar width="16" height="16" />,
          tooltip: t("switch_monthly"),
        },
        {
          value: "large_calendar",
          label: <Grid width="16" height="16" />,
          tooltip: t("switch_weekly"),
        },
        {
          value: "large_timeslots",
          label: <Columns width="16" height="16" />,
          tooltip: t("switch_multiday"),
        },
      ]}
    />
  );
};
