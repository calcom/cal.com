// TODO: replace headlessui with radix-ui
import { FC, useEffect, useState } from "react";
import TimezoneSelect, { ITimezoneOption } from "react-timezone-select";

import { useLocale } from "@lib/hooks/useLocale";

import { timeZone } from "../../lib/clock";

type Props = {
  onSelectTimeZone: (selectedTimeZone: string) => void;
};

const TimeOptions: FC<Props> = (props) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const { t } = useLocale();

  useEffect(() => {
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      props.onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone]);

  return selectedTimeZone !== "" ? (
    <div className="max-w-80 absolute z-10 w-full rounded-sm border border-gray-200 bg-white px-4 py-2 dark:border-0 dark:bg-gray-700">
      <div className="mb-4 flex">
        <div className="w-1/2 font-medium text-gray-600 dark:text-white">{t("time_options")}</div>
      </div>
      <TimezoneSelect
        id="timeZone"
        value={selectedTimeZone}
        onChange={(tz: ITimezoneOption) => setSelectedTimeZone(tz.value)}
        className="focus:border-brand mt-1 mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:ring-black sm:text-sm"
      />
    </div>
  ) : null;
};

export default TimeOptions;
