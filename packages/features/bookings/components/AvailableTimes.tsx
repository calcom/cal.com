import { useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { Slots } from "@calcom/features/schedules";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { detectBrowserTimeFormat, setIs24hClockInLocalStorage, TimeFormat } from "@calcom/lib/timeFormat";
import { nameOfDay } from "@calcom/lib/weekday";
import { ToggleGroup, Button } from "@calcom/ui";

// * Brand color variable?
// @TODO: from old booker:

type AvailableTimesProps = {
  date: Dayjs;
  slots: Slots[string];
  timezone: string;
  onTimeSelect: (time: string) => void;
};

export const AvailableTimes = ({ date, slots, timezone, onTimeSelect }: AvailableTimesProps) => {
  const { t, i18n } = useLocale();
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(detectBrowserTimeFormat);

  return (
    <div className="dark:text-white">
      <header className="dark:bg-darkgray-100 dark:before:bg-darkgray-100 sticky top-0 left-0 z-10 mb-6 flex w-full items-center bg-white before:absolute before:-top-7 before:h-7 before:w-full before:bg-white">
        <span className="font-semibold text-gray-900 dark:text-white">
          {nameOfDay(i18n.language, Number(date.format("d")), "short")}
        </span>
        <span className="mr-4">
          , {date.toDate().toLocaleString(i18n.language, { month: "short" })} {date.format(" D ")}
        </span>

        <div className="ml-auto">
          <ToggleGroup
            onValueChange={(newFormat) => {
              setTimeFormat(newFormat as TimeFormat);
              setIs24hClockInLocalStorage(newFormat === TimeFormat.TWENTY_FOUR_HOUR);
            }}
            defaultValue={timeFormat}
            options={[
              { value: TimeFormat.TWELVE_HOUR, label: t("12_hour_short") },
              { value: TimeFormat.TWENTY_FOUR_HOUR, label: t("24_hour_short") },
            ]}
          />
        </div>
      </header>
      <div>
        {slots.map((slot) => (
          <div key={slot.time}>
            <Button
              onClick={() => onTimeSelect(dayjs.utc(slot.time).tz(timezone).format())}
              className="mb-2 flex h-[44px] w-full justify-center"
              color="secondary">
              {dayjs(slot.time).tz(timezone).format(timeFormat)}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
