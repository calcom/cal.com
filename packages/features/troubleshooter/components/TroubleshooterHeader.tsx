import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

import { useTroubleshooterStore } from "../store";

export function TroubleshooterHeader({ extraDays, isMobile }: { extraDays: number; isMobile: boolean }) {
  const { t, i18n } = useLocale();
  const selectedDateString = useTroubleshooterStore((state) => state.selectedDate);
  const setSelectedDate = useTroubleshooterStore((state) => state.setSelectedDate);
  const addToSelectedDate = useTroubleshooterStore((state) => state.addToSelectedDate);
  const selectedDate = selectedDateString ? dayjs(selectedDateString) : dayjs();
  const today = dayjs();
  const selectedDateMin3DaysDifference = useMemo(() => {
    const diff = today.diff(selectedDate, "days");
    return diff > 3 || diff < -3;
  }, [today, selectedDate]);

  if (isMobile) return null;

  const endDate = selectedDate.add(extraDays - 1, "days");

  const isSameMonth = () => {
    return selectedDate.format("MMM") === endDate.format("MMM");
  };

  const isSameYear = () => {
    return selectedDate.format("YYYY") === endDate.format("YYYY");
  };
  const formattedMonth = new Intl.DateTimeFormat(i18n.language, { month: "short" });
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
      <div className="flex items-center gap-5 rtl:grow">
        <FormattedSelectedDateRange />
        <ButtonGroup>
          <Button
            className="group rtl:ml-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-left"
            aria-label="Previous Day"
            onClick={() => addToSelectedDate(-extraDays)}
          />
          <Button
            className="group rtl:mr-1 rtl:rotate-180"
            variant="icon"
            color="minimal"
            StartIcon="chevron-right"
            aria-label="Next Day"
            onClick={() => addToSelectedDate(extraDays)}
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
    </div>
  );
}
