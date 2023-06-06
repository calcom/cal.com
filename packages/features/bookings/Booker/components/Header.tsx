import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { Button, ButtonGroup, ToggleGroup } from "@calcom/ui";
import { Calendar, Columns, Grid } from "@calcom/ui/components/icon";

import { TimeFormatToggle } from "../../components/TimeFormatToggle";
import { useBookerStore } from "../store";
import type { BookerLayout } from "../types";

export function Header({
  extraDays,
  isMobile,
  enabledLayouts,
}: {
  extraDays: number;
  isMobile: boolean;
  enabledLayouts: BookerLayouts[];
}) {
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  const selectedDateString = useBookerStore((state) => state.selectedDate);
  const addToSelectedDate = useBookerStore((state) => state.addToSelectedDate);
  const isMonthView = layout === BookerLayouts.MONTH_VIEW;
  const selectedDate = dayjs(selectedDateString);

  const onLayoutToggle = useCallback(
    (newLayout: string) => setLayout(newLayout as BookerLayout),
    [setLayout]
  );

  if (isMobile || !enabledLayouts || enabledLayouts.length <= 1) return null;

  // Only reason we create this component, is because it is used 3 times in this component,
  // and this way we can't forget to update one of the props in all places :)
  const LayoutToggleWithData = () => (
    <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} enabledLayouts={enabledLayouts} />
  );

  // In month view we only show the layout toggle.
  if (isMonthView) {
    return (
      <div className="fixed top-3 right-3 z-10">
        <LayoutToggleWithData />
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
          <LayoutToggleWithData />
        </div>
        {/*
          This second layout toggle is hidden, but needed to reserve the correct spot in the DIV
          for the fixed toggle above to fit into. If we wouldn't make it fixed in this view, the transition
          would be really weird, because the element is positioned fixed in the month view, and then
          when switching layouts wouldn't anymmore, causing it to animate from the center to the top right,
          while it actuall already was on place. That's why we have this element twice.
        */}
        <div className="pointer-events-none opacity-0" aria-hidden>
          <LayoutToggleWithData />
        </div>
      </div>
    </div>
  );
}

const LayoutToggle = ({
  onLayoutToggle,
  layout,
  enabledLayouts,
}: {
  onLayoutToggle: (layout: string) => void;
  layout: string;
  enabledLayouts?: BookerLayouts[];
}) => {
  const { t } = useLocale();
  const layoutOptions = useMemo(() => {
    return [
      {
        value: BookerLayouts.MONTH_VIEW,
        label: <Calendar width="16" height="16" />,
        tooltip: t("switch_monthly"),
      },
      {
        value: BookerLayouts.WEEK_VIEW,
        label: <Grid width="16" height="16" />,
        tooltip: t("switch_weekly"),
      },
      {
        value: BookerLayouts.COLUMN_VIEW,
        label: <Columns width="16" height="16" />,
        tooltip: t("switch_multiday"),
      },
    ].filter((layout) => enabledLayouts?.includes(layout.value as BookerLayouts));
  }, [t, enabledLayouts]);

  return <ToggleGroup onValueChange={onLayoutToggle} defaultValue={layout} options={layoutOptions} />;
};
