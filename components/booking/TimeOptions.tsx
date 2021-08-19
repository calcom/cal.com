import { Switch } from "@headlessui/react";
import TimezoneSelect from "react-timezone-select";
import { useEffect, useState } from "react";
import { is24h, timeZone } from "../../lib/clock";
import classNames from "@lib/classNames";

const TimeOptions = (props) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [is24hClock, setIs24hClock] = useState(false);

  useEffect(() => {
    setIs24hClock(is24h());
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      props.onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone]);

  useEffect(() => {
    props.onToggle24hClock(is24h(is24hClock));
  }, [is24hClock]);

  return (
    selectedTimeZone !== "" && (
      <div className="absolute z-10 px-4 py-2 w-full max-w-80 dark:bg-gray-700 bg-white border dark:border-0 border-gray-200 rounded-sm">
        <div className="flex mb-4">
          <div className="w-1/2 text-gray-600 dark:text-white font-medium">Time Options</div>
          <div className="w-1/2">
            <Switch.Group as="div" className="flex items-center justify-end">
              <Switch.Label as="span" className="mr-3">
                <span className="text-gray-500 dark:text-white text-sm">am/pm</span>
              </Switch.Label>
              <Switch
                checked={is24hClock}
                onChange={setIs24hClock}
                className={classNames(
                  is24hClock ? "bg-black" : "dark:bg-gray-600 bg-gray-200",
                  "relative inline-flex flex-shrink-0 w-8 h-5 border-2 border-transparent rounded-full focus:outline-none cursor-pointer transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-black focus:ring-offset-2"
                )}>
                <span className="sr-only">Use setting</span>
                <span
                  aria-hidden="true"
                  className={classNames(
                    is24hClock ? "translate-x-3" : "translate-x-0",
                    "inline-block w-4 h-4 bg-white rounded-full shadow pointer-events-none transform transition duration-200 ease-in-out ring-0"
                  )}
                />
              </Switch>
              <Switch.Label as="span" className="ml-3">
                <span className="text-gray-500 dark:text-white text-sm">24h</span>
              </Switch.Label>
            </Switch.Group>
          </div>
        </div>
        <TimezoneSelect
          id="timeZone"
          value={selectedTimeZone}
          onChange={(tz) => setSelectedTimeZone(tz.value)}
          className="block mb-2 mt-1 w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
        />
      </div>
    )
  );
};

export default TimeOptions;
