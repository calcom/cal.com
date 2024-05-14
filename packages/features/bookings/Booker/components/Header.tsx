import { useCallback, useMemo } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { Button, ButtonGroup, Icon, ToggleGroup, Tooltip } from "@calcom/ui";

import { TimeFormatToggle } from "../../components/TimeFormatToggle";
import { useBookerStore } from "../store";
import type { BookerLayout } from "../types";

export function Header({
  extraDays,
  isMobile,
  enabledLayouts,
  nextSlots,
  eventSlug,
  isMyLink,
  renderOverlay,
}: {
  extraDays: number;
  isMobile: boolean;
  enabledLayouts: BookerLayouts[];
  nextSlots: number;
  eventSlug: string;
  isMyLink: boolean;
  renderOverlay?: () => JSX.Element | null;
}) {
  const { t, i18n } = useLocale();
  const isEmbed = useIsEmbed();
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  const selectedDateString = useBookerStore((state) => state.selectedDate);
  const setSelectedDate = useBookerStore((state) => state.setSelectedDate);
  const addToSelectedDate = useBookerStore((state) => state.addToSelectedDate);
  const isMonthView = layout === BookerLayouts.MONTH_VIEW;
  const selectedDate = dayjs(selectedDateString);
  const today = dayjs();
  const selectedDateMin3DaysDifference = useMemo(() => {
    const diff = today.diff(selectedDate, "days");
    return diff > 3 || diff < -3;
  }, [today, selectedDate]);

  const onLayoutToggle = useCallback(
    (newLayout: string) => {
      if (layout === newLayout || !newLayout) return;
      setLayout(newLayout as BookerLayout);
    },
    [setLayout, layout]
  );

  if (isMobile || !enabledLayouts) return null;

  // In month view we only show the layout toggle.
  if (isMonthView) {
    return (
      <div className="flex gap-2">
        {isMyLink && !isEmbed ? (
          <Tooltip content={t("troubleshooter_tooltip")} side="bottom">
            <Button
              color="primary"
              target="_blank"
              href={`${WEBAPP_URL}/availability/troubleshoot?eventType=${eventSlug}`}>
              {t("need_help")}
            </Button>
          </Tooltip>
        ) : (
          renderOverlay?.()
        )}
        <LayoutToggleWithData
          layout={layout}
          enabledLayouts={enabledLayouts}
          onLayoutToggle={onLayoutToggle}
        />
      </div>
    );
  }
  const endDate = selectedDate.add(layout === BookerLayouts.COLUMN_VIEW ? extraDays : extraDays - 1, "days");

  const isSameMonth = () => {
    return selectedDate.format("MMM") === endDate.format("MMM");
  };

  const isSameYear = () => {
    return selectedDate.format("YYYY") === endDate.format("YYYY");
  };
  const formattedMonth = new Intl.DateTimeFormat(i18n.language ?? "en", { month: "short" });
  const FormattedSelectedDateRange = () => {
    return (
      <h3 className="min-w-[150px] text-base font-semibold leading-4">
        {formattedMonth.format(selectedDate.toDate())} {selectedDate.format("D")}
        {!isSameYear() && <span className="text-subtle">, {selectedDate.format("YYYY")} </span>}-{" "}
        {!isSameMonth() && formattedMonth.format(endDate.toDate())} {endDate.format("D")},{" "}
        <span className="text-subtle">
          {isSameYear() ? selectedDate.format("YYYY") : endDate.format("YYYY")}
        </span>
      </h3>
    );
  };

  return (
    <div className="border-default relative z-10 flex border-b px-5 py-4 ltr:border-l rtl:border-r">
      <div className="flex items-center gap-5 rtl:flex-grow">
        <FormattedSelectedDateRange />
        <ButtonGroup>
          <Button
            className="group rtl:ml-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-left"
            aria-label="Previous Day"
            onClick={() => addToSelectedDate(layout === BookerLayouts.COLUMN_VIEW ? -nextSlots : -extraDays)}
          />
          <Button
            className="group rtl:mr-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-right"
            aria-label="Next Day"
            onClick={() => addToSelectedDate(layout === BookerLayouts.COLUMN_VIEW ? nextSlots : extraDays)}
          />
          {selectedDateMin3DaysDifference && (
            <Button
              className="capitalize ltr:ml-2 rtl:mr-2"
              color="secondary"
              onClick={() => setSelectedDate(today.format("YYYY-MM-DD"))}>
              {t("today")}
            </Button>
          )}
        </ButtonGroup>
      </div>
      <div className="ml-auto flex gap-2">
        {renderOverlay?.()}
        <TimeFormatToggle />
        <div className="fixed top-4 ltr:right-4 rtl:left-4">
          <LayoutToggleWithData
            layout={layout}
            enabledLayouts={enabledLayouts}
            onLayoutToggle={onLayoutToggle}
          />
        </div>
        {/*
          This second layout toggle is hidden, but needed to reserve the correct spot in the DIV
          for the fixed toggle above to fit into. If we wouldn't make it fixed in this view, the transition
          would be really weird, because the element is positioned fixed in the month view, and then
          when switching layouts wouldn't anymore, causing it to animate from the center to the top right,
          while it actually already was on place. That's why we have this element twice.
        */}
        <div className="pointer-events-none opacity-0" aria-hidden>
          <LayoutToggleWithData
            layout={layout}
            enabledLayouts={enabledLayouts}
            onLayoutToggle={onLayoutToggle}
          />
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
  const isEmbed = useIsEmbed();

  const { t } = useLocale();

  const layoutOptions = useMemo(() => {
    return [
      {
        value: BookerLayouts.MONTH_VIEW,
        label: <Icon name="calendar" width="16" height="16" />,
        tooltip: t("switch_monthly"),
      },
      {
        value: BookerLayouts.WEEK_VIEW,
        label: <Icon name="grid-3x3" width="16" height="16" />,
        tooltip: t("switch_weekly"),
      },
      {
        value: BookerLayouts.COLUMN_VIEW,
        label: <Icon name="columns-3" width="16" height="16" />,
        tooltip: t("switch_columnview"),
      },
    ].filter((layout) => enabledLayouts?.includes(layout.value as BookerLayouts));
  }, [t, enabledLayouts]);

  // We don't want to show the layout toggle in embed mode as of now as it doesn't look rightly placed when embedded.
  // There is a Embed API to control the layout toggle from outside of the iframe.
  if (isEmbed) {
    return null;
  }

  return <ToggleGroup onValueChange={onLayoutToggle} defaultValue={layout} options={layoutOptions} />;
};

const LayoutToggleWithData = ({
  enabledLayouts,
  onLayoutToggle,
  layout,
}: {
  enabledLayouts: BookerLayouts[];
  onLayoutToggle: (layout: string) => void;
  layout: string;
}) => {
  return enabledLayouts.length <= 1 ? null : (
    <LayoutToggle onLayoutToggle={onLayoutToggle} layout={layout} enabledLayouts={enabledLayouts} />
  );
};
