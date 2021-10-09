// TODO: replace headlessui with radix-ui
import { Switch } from "@headlessui/react";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";
import TimezoneSelect, { ITimezoneOption } from "react-timezone-select";

import classNames from "@lib/classNames";
import { timeZone } from "@lib/clock";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";

type Props = {
  localeProp: string;
  onSelectTimeZone: (selectedTimeZone: string) => void;
};

const TimeOptions: FC<Props> = (props) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [is24hClock, setIs24hClock] = useState(false);
  const { t } = useLocale({ localeProp: props.localeProp });
  const hour12 = useToggleQuery("hour12", { zero: true });
  const router = useRouter();

  useEffect(() => {
    setIs24hClock(
      (router.query.hour12 !== undefined && !hour12.isOn) ||
        !new Intl.DateTimeFormat(props.localeProp, { timeStyle: "short" })
          .format(new Date())
          .match(/\d+:\d+ (AM|PM)/)
    );
    setSelectedTimeZone(timeZone());
  }, [props.localeProp, hour12.isOn, router.query.hour12]);

  const handle24hClockToggle = (is24hClock: boolean) => {
    setIs24hClock(is24hClock);
    router.push(is24hClock ? hour12.hrefOff : hour12.hrefOn);
  };

  const handleSelectTimeZone = (tz: ITimezoneOption) => {
    if (tz.value !== timeZone()) {
      setSelectedTimeZone(tz.value);
      props.onSelectTimeZone(timeZone(tz.value));
    }
  };

  return selectedTimeZone !== "" ? (
    <div className="absolute z-10 w-full px-4 py-2 bg-white border border-gray-200 rounded-sm max-w-80 dark:bg-gray-700 dark:border-0">
      <div className="flex mb-4">
        <div className="w-1/2 font-medium text-gray-600 dark:text-white">{t("time_options")}</div>
        <div className="w-1/2">
          <Switch.Group as="div" className="flex items-center justify-end">
            <Switch.Label as="span" className="mr-3">
              <span className="text-sm text-gray-500 dark:text-white">{t("am_pm")}</span>
            </Switch.Label>
            <Switch
              checked={is24hClock}
              onChange={handle24hClockToggle}
              className={classNames(
                is24hClock ? "bg-black" : "dark:bg-gray-600 bg-gray-200",
                "relative inline-flex flex-shrink-0 h-5 w-8 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              )}>
              <span className="sr-only">{t("use_setting")}</span>
              <span
                aria-hidden="true"
                className={classNames(
                  is24hClock ? "translate-x-3" : "translate-x-0",
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3">
              <span className="text-sm text-gray-500 dark:text-white">{t("24_h")}</span>
            </Switch.Label>
          </Switch.Group>
        </div>
      </div>
      <TimezoneSelect
        id="timeZone"
        value={selectedTimeZone}
        onChange={handleSelectTimeZone}
        className="block w-full mt-1 mb-2 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
      />
    </div>
  ) : null;
};

export default TimeOptions;
