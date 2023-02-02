import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import type { ITimezone } from "@calcom/ui";
import { Avatar, DatePicker, Label, Select, TimezoneSelect } from "@calcom/ui";

import LicenseRequired from "../../../common/components/LicenseRequired";
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

  const { t } = useLocale();

  const [frequency, setFrequency] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    utils.viewer.teams.getMemberAvailability.invalidate();
  }, [utils, selectedTimeZone, selectedDate]);

  return (
    <LicenseRequired>
      <>
        <div className="grid h-[400px] grid-cols-2 space-x-11 rtl:space-x-reverse">
          <div className="col-span-1">
            <div className="flex">
              <Avatar
                size="md"
                imageSrc={WEBAPP_URL + "/" + props.member?.username + "/avatar.png"}
                alt={props.member?.name || ""}
              />
              <div className="flex items-center justify-center ">
                <span className="ml-2 text-base font-semibold leading-4 text-gray-500">
                  {props.member?.name}
                </span>
              </div>
            </div>
            <div>
              <div className="text-brand-900 mt-4 mb-5 text-2xl font-semibold">{t("availability")}</div>
              <DatePicker
                minDate={new Date()}
                date={selectedDate.toDate() || dayjs().toDate()}
                onDatesChange={(newDate) => {
                  setSelectedDate(dayjs(newDate));
                }}
              />

              <Label className="mt-4">{t("timezone")}</Label>
              <TimezoneSelect
                id="timeZone"
                autoFocus
                value={selectedTimeZone}
                className="w-64 rounded-md"
                onChange={(timezone) => setSelectedTimeZone(timezone.value)}
                classNamePrefix="react-select"
              />
            </div>
            <div className="mt-3">
              <Label>{t("slot_length")}</Label>
              <Select
                options={[
                  { value: 15, label: "15 minutes" },
                  { value: 30, label: "30 minutes" },
                  { value: 60, label: "60 minutes" },
                ]}
                isSearchable={false}
                classNamePrefix="react-select"
                className="w-64"
                value={{ value: frequency, label: `${frequency} minutes` }}
                onChange={(newFrequency) => setFrequency(newFrequency?.value ?? 30)}
              />
            </div>
          </div>

          <div className="col-span-1 max-h-[500px]">
            {props.team && props.member && (
              <TeamAvailabilityTimes
                teamId={props.team.id}
                memberId={props.member.id}
                frequency={frequency}
                selectedDate={selectedDate}
                selectedTimeZone={selectedTimeZone}
              />
            )}
          </div>
        </div>
      </>
    </LicenseRequired>
  );
}
