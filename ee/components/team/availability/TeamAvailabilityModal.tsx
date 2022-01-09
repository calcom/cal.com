import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import React, { useState, useEffect } from "react";
import TimezoneSelect, { ITimezone } from "react-timezone-select";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { trpc, inferQueryOutput } from "@lib/trpc";

import Avatar from "@components/ui/Avatar";
import { DatePicker } from "@components/ui/form/DatePicker";
import Select from "@components/ui/form/Select";

import TeamAvailabilityTimes from "./TeamAvailabilityTimes";

dayjs.extend(utc);

interface Props {
  team?: inferQueryOutput<"viewer.teams.get">;
  member?: inferQueryOutput<"viewer.teams.get">["members"][number];
}

export default function TeamAvailabilityModal(props: Props) {
  const utils = trpc.useContext();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(
    localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()
  );
  const [frequency, setFrequency] = useState<15 | 30 | 60>(30);

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
          <Select
            options={[
              { value: 15, label: "15 minutes" },
              { value: 30, label: "30 minutes" },
              { value: 60, label: "60 minutes" },
            ]}
            isSearchable={false}
            classNamePrefix="react-select"
            className="flex-1 block w-full min-w-0 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={{ value: frequency, label: `${frequency} minutes` }}
            onChange={(newFrequency) => setFrequency(newFrequency?.value ?? 30)}
          />
        </div>
      </div>
      {props.team && props.member && (
        <TeamAvailabilityTimes
          className="overflow-scroll"
          teamId={props.team.id}
          memberId={props.member.id}
          frequency={frequency}
          selectedDate={selectedDate}
          selectedTimeZone={selectedTimeZone}
        />
      )}
    </div>
  );
}
