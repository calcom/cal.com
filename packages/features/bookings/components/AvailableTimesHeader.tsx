import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { useBookerStore } from "../Booker/store";
import { TimeFormatToggle } from "./TimeFormatToggle";

type AvailableTimesHeaderProps = {
  date: Dayjs;
  showTimeFormatToggle?: boolean;
  availableMonth?: string | undefined;
};

export const AvailableTimesHeader = ({
  date,
  showTimeFormatToggle = true,
  availableMonth,
}: AvailableTimesHeaderProps) => {
  const { t, i18n } = useLocale();
  const [layout] = useBookerStore((state) => [state.layout], shallow);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const isMonthView = layout === BookerLayouts.MONTH_VIEW;
  const isToday = dayjs().isSame(date, "day");

  return (
    <header className="bg-default before:bg-default dark:bg-muted dark:before:bg-muted mb-3 flex w-full flex-row items-center font-medium">
      <span
        className={classNames(
          isColumnView && "w-full text-center",
          isColumnView ? "text-subtle text-xs uppercase" : "text-emphasis font-semibold"
        )}>
        <span className={classNames(isToday && "!text-default")}>
          {nameOfDay(i18n.language, Number(date.format("d")), "short")}
        </span>
        <span
          className={classNames(
            isColumnView && isToday && "bg-brand-default text-brand ml-2",
            "inline-flex items-center justify-center rounded-3xl px-1 pt-0.5 font-medium",
            isMonthView ? "text-default text-sm" : "text-xs"
          )}>
          {date.format("DD")}
          {availableMonth && `, ${availableMonth}`}
        </span>
      </span>

      {showTimeFormatToggle && (
        <div className="ml-auto rtl:mr-auto">
          <TimeFormatToggle />
        </div>
      )}
    </header>
  );
};
