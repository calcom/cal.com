import { FC, useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import TimezoneSelect, { ITimezoneOption } from "@calcom/ui/v2/core/TimezoneSelect";

import { timeZone } from "../../lib/clock";

type Props = {
  onSelectTimeZone: (selectedTimeZone: string) => void;
};

const TimeOptions: FC<Props> = ({ onSelectTimeZone }) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const { t } = useLocale();

  useEffect(() => {
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone, onSelectTimeZone]);

  return selectedTimeZone !== "" ? (
    <div className="dark:border-darkgray-300 dark:bg-darkgray-200 rounded-sm border border-gray-200 bg-white px-4 pt-4 pb-3 shadow-sm">
      <div className="mb-4 flex">
        <div className="text-sm font-medium text-gray-600 dark:text-white">{t("time_options")}</div>
      </div>
      <TimezoneSelect
        id="timeZone"
        value={selectedTimeZone}
        onChange={(tz: ITimezoneOption) => setSelectedTimeZone(tz.value)}
        className="focus:border-brand mt-1 mb-2 block w-full rounded-md border-gray-300 text-sm focus:ring-black"
      />
    </div>
  ) : null;
};

export default TimeOptions;
