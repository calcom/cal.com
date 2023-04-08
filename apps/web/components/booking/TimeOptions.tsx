import type { FC } from "react";
import { useEffect, useState } from "react";

import type { ITimezoneOption } from "@calcom/ui";
import { TimezoneSelect } from "@calcom/ui";

import { timeZone } from "../../lib/clock";

type Props = {
  onSelectTimeZone: (selectedTimeZone: string) => void;
};

const TimeOptions: FC<Props> = ({ onSelectTimeZone }) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");

  useEffect(() => {
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone, onSelectTimeZone]);

  return !!selectedTimeZone ? (
    <TimezoneSelect
      id="timeZone"
      classNames={{
        singleValue: () => "text-default",
        dropdownIndicator: () => "text-default",
        menu: () => "!w-64 max-w-[90vw]",
      }}
      variant="minimal"
      value={selectedTimeZone}
      onChange={(tz: ITimezoneOption) => setSelectedTimeZone(tz.value)}
    />
  ) : null;
};

export default TimeOptions;
