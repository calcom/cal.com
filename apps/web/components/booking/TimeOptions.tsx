// TODO: replace headlessui with radix-ui
import { Switch } from "@headlessui/react";
import { FC, useEffect, useState } from "react";
import TimezoneSelect, { ITimezoneOption } from "react-timezone-select";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

import { is24h, timeZone } from "../../lib/clock";

type Props = {
  onSelectTimeZone: (selectedTimeZone: string) => void;
  onToggle24hClock: (is24hClock: boolean) => void;
};

const TimeOptions: FC<Props> = (props) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [is24hClock, setIs24hClock] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    setIs24hClock(is24h());
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      props.onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone]);

  const handle24hClockToggle = (is24hClock: boolean) => {
    setIs24hClock(is24hClock);
    props.onToggle24hClock(is24h(is24hClock));
  };

  return selectedTimeZone !== "" ? (
    <div className="max-w-80 absolute z-10 w-full rounded-sm border border-gray-200 bg-white px-4 py-2 dark:border-0 dark:bg-gray-700">
      <div className="mb-4 flex">
        <div className="w-1/2 font-medium text-gray-600 dark:text-white">{t("time_options")}</div>
        <div className="w-1/2">
          <Switch.Group as="div" className="flex items-center justify-end">
            <Switch.Label as="span" className="ltr:mr-3">
              <span className="text-sm text-gray-500 dark:text-white">{t("am_pm")}</span>
            </Switch.Label>
            <Switch
              checked={is24hClock}
              onChange={handle24hClockToggle}
              className={classNames(
                is24hClock ? "bg-brand text-brandcontrast" : "bg-gray-200 dark:bg-gray-600",
                "relative inline-flex h-5 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              )}>
              <span className="sr-only">{t("use_setting")}</span>
              <span
                aria-hidden="true"
                className={classNames(
                  is24hClock ? "translate-x-3" : "translate-x-0",
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ltr:ml-3 rtl:mr-3">
              <span className="text-sm text-gray-500 dark:text-white">{t("24_h")}</span>
            </Switch.Label>
          </Switch.Group>
        </div>
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
