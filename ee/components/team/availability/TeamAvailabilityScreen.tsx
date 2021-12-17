import dayjs from "dayjs";
import React, { useState, useEffect, CSSProperties } from "react";
import TimezoneSelect, { ITimezone } from "react-timezone-select";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { trpc, inferQueryOutput } from "@lib/trpc";

import Avatar from "@components/ui/Avatar";
import { DatePicker } from "@components/ui/form/DatePicker";
import Select from "@components/ui/form/Select";

import TeamAvailabilityTimes from "./TeamAvailabilityTimes";

interface Props {
  team?: inferQueryOutput<"viewer.teams.get">;
}

export default function TeamAvailabilityScreen(props: Props) {
  const utils = trpc.useContext();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(
    localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()
  );
  const [frequency, setFrequency] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    utils.invalidateQueries(["viewer.teams.getMemberAvailability"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeZone, selectedDate]);

  const Item = ({ index, style }: { index: number; style: CSSProperties }) => {
    const member = props.team?.members?.[index];
    if (!member) return <></>;

    return (
      <div key={member.id} style={style} className="flex pl-4 border-r border-gray-200 ">
        <TeamAvailabilityTimes
          teamId={props.team?.id as number}
          memberId={member.id}
          frequency={frequency}
          selectedDate={selectedDate}
          selectedTimeZone={selectedTimeZone}
          HeaderComponent={
            <div className="flex items-center mb-6">
              <Avatar
                imageSrc={getPlaceholderAvatar(member?.avatar, member?.name as string)}
                alt={member?.name || ""}
                className="w-10 h-10 mt-1 rounded-full min-w-10 min-h-10"
              />
              <div className="inline-block pt-1 ml-3 overflow-hidden">
                <span className="text-lg font-bold truncate text-neutral-700">{member?.name}</span>
                <span className="block -mt-1 text-sm text-gray-400 truncate">{member?.email}</span>
              </div>
            </div>
          }
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 bg-white border rounded-sm border-neutral-200">
      <div className="flex w-full p-5 pr-0 space-x-5 border-b border-gray-200">
        <div className="flex flex-col">
          <span className="font-bold text-gray-600">Date</span>
          <DatePicker
            date={selectedDate.toDate()}
            className="p-1.5"
            onDatesChange={(newDate) => {
              setSelectedDate(dayjs(newDate));
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-gray-600">Timezone</span>
          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={(timezone) => setSelectedTimeZone(timezone.value)}
            classNamePrefix="react-select"
            className="w-full border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
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
      <div className="flex flex-1 h-full">
        <AutoSizer>
          {({ height, width }) => (
            <List
              itemSize={240}
              itemCount={props.team?.members?.length ?? 0}
              className="List"
              height={height}
              layout="horizontal"
              width={width}>
              {Item}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
