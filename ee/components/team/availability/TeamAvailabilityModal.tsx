import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import React, { useState, useEffect } from "react";
import TimezoneSelect, { ITimezone } from "react-timezone-select";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { trpc, inferQueryOutput } from "@lib/trpc";

import Avatar from "@components/ui/Avatar";
import { DatePicker } from "@components/ui/form/DatePicker";
import MinutesField from "@components/ui/form/MinutesField";

import TeamAvailabilityTimes from "./TeamAvailabilityTimes";

dayjs.extend(utc);

interface Props {
  team?: inferQueryOutput<"viewer.teams.get">;
  member?: inferQueryOutput<"viewer.teams.get">["members"][number];
}

export default function TeamAvailabilityModal(props: Props) {
  const utils = trpc.useContext();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(dayjs.tz.guess);
  const [frequency, setFrequency] = useState<number>(30);

  useEffect(() => {
    utils.invalidateQueries(["viewer.teams.getMemberAvailability"]);
  }, [utils, selectedTimeZone, selectedDate]);

  return (
    <div className="flex flex-row max-h-[500px] min-h-[500px]  space-x-8">
      <div className="w-64 p-5 pr-0 space-y-5 min-w-64">
        <div className="flex">
          <Avatar
            imageSrc={getPlaceholderAvatar(props.member?.avatar, props.member?.name as string)}
            alt={props.member?.name || ""}
            className="rounded-full w-14 h-14"
          />
          <div className="inline-block pt-1 ml-3">
            <span className="text-lg font-bold text-neutral-700">{props.member?.name}</span>
            <span className="block -mt-1 text-sm text-gray-400">{props.member?.email}</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-gray-600">Date</span>
          <DatePicker
            date={selectedDate.toDate()}
            onDatesChange={(newDate) => {
              setSelectedDate(dayjs(newDate));
            }}
          />
        </div>
        <div>
          <span className="font-bold text-gray-600">Timezone</span>
          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={(timezone) => setSelectedTimeZone(timezone.value)}
            classNamePrefix="react-select"
            className="block w-full mt-1 border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
          />
        </div>
        <div>
          <span className="font-bold text-gray-600">Slot Length</span>
          <MinutesField
            id="length"
            label=""
            required
            min="10"
            placeholder="15"
            defaultValue={frequency}
            onChange={(e) => {
              setFrequency(Number(e.target.value));
            }}
          />
        </div>
      </div>
      {props.team && props.member && (
        <TeamAvailabilityTimes
          className="overflow-scroll"
          team={props.team}
          member={props.member}
          frequency={frequency}
          selectedDate={selectedDate}
          selectedTimeZone={selectedTimeZone}
        />
      )}
    </div>
  );
}
