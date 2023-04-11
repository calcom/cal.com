import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { ITimezone } from "@calcom/ui";
import { Avatar, DatePickerField as DatePicker, Select, TimezoneSelect } from "@calcom/ui";

import LicenseRequired from "../../common/components/LicenseRequired";
import TeamAvailabilityTimes from "./TeamAvailabilityTimes";

interface Props {
  team?: RouterOutputs["viewer"]["teams"]["get"];
  member?: RouterOutputs["viewer"]["teams"]["get"]["members"][number];
}

export default function TeamAvailabilityModal(props: Props) {
  const utils = trpc.useContext();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(
    localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()
  );
  const [frequency, setFrequency] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    utils.viewer.teams.getMemberAvailability.invalidate();
  }, [utils, selectedTimeZone, selectedDate]);

  return (
    <LicenseRequired>
      <div className="flex max-h-[500px] min-h-[500px] flex-row  space-x-8 rtl:space-x-reverse">
        <div className="min-w-64 w-64 space-y-5 p-5 pr-0">
          <div className="flex">
            <Avatar
              size="sm"
              imageSrc={WEBAPP_URL + "/" + props.member?.username + "/avatar.png"}
              alt={props.member?.name || ""}
              className="h-14 w-14 rounded-full"
            />
            <div className="ms-3 inline-block pt-1">
              <span className="text-default text-lg font-bold">{props.member?.name}</span>
              <span className="text-muted -mt-1 block text-sm">{props.member?.email}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-default font-bold">Date</span>
            <DatePicker
              date={selectedDate.toDate()}
              onDatesChange={(newDate) => {
                setSelectedDate(dayjs(newDate));
              }}
            />
          </div>
          <div>
            <span className="text-default font-bold">Timezone</span>
            <TimezoneSelect
              id="timeZone"
              value={selectedTimeZone}
              onChange={(timezone) => setSelectedTimeZone(timezone.value)}
              classNamePrefix="react-select"
              className="react-select-container border-default mt-1 block w-full rounded-sm border text-sm focus:border-neutral-800 focus:ring-neutral-800"
            />
          </div>
          <div>
            <span className="text-default font-bold">Slot Length</span>
            <Select
              options={[
                { value: 15, label: "15 minutes" },
                { value: 30, label: "30 minutes" },
                { value: 60, label: "60 minutes" },
              ]}
              isSearchable={false}
              classNamePrefix="react-select"
              className="react-select-container focus:ring-primary-500 focus:border-primary-500 border-default block w-full min-w-0 flex-1 rounded-sm border text-sm"
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
    </LicenseRequired>
  );
}
