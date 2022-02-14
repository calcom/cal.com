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
      <div key={member.id} style={style} className="flex border-r border-gray-200 pl-4 ">
        <TeamAvailabilityTimes
          teamId={props.team?.id as number}
          memberId={member.id}
          frequency={frequency}
          selectedDate={selectedDate}
          selectedTimeZone={selectedTimeZone}
          HeaderComponent={
            <div className="mb-6 flex items-center">
              <Avatar
                imageSrc={getPlaceholderAvatar(member?.avatar, member?.name as string)}
                alt={member?.name || ""}
                className="min-h-10 min-w-10 mt-1 h-10 w-10 rounded-full"
              />
              <div className="ml-3 inline-block overflow-hidden pt-1">
                <span className="truncate text-lg font-bold text-neutral-700">{member?.name}</span>
                <span className="-mt-1 block truncate text-sm text-gray-400">{member?.email}</span>
              </div>
            </div>
          }
        />
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col rounded-sm border border-neutral-200 bg-white">
      <div className="flex w-full space-x-5 border-b border-gray-200 p-4 rtl:space-x-reverse">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Date</span>
          <DatePicker
            date={selectedDate.toDate()}
            className="p-1.5"
            onDatesChange={(newDate) => {
              setSelectedDate(dayjs(newDate));
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Timezone</span>
          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={(timezone) => setSelectedTimeZone(timezone.value)}
            classNamePrefix="react-select"
            className="react-select-container w-full rounded-sm border border-gray-300 shadow-sm focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
          />
        </div>
        <div className="hidden sm:block">
          <span className="text-sm font-medium text-neutral-700">Slot Length</span>
          <Select
            options={[
              { value: 15, label: "15 minutes" },
              { value: 30, label: "30 minutes" },
              { value: 60, label: "60 minutes" },
            ]}
            isSearchable={false}
            classNamePrefix="react-select"
            className="react-select-container focus:border-primary-500 focus:ring-primary-500 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
            value={{ value: frequency, label: `${frequency} minutes` }}
            onChange={(newFrequency) => setFrequency(newFrequency?.value ?? 30)}
          />
        </div>
      </div>
      <div className="flex h-full flex-1">
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
