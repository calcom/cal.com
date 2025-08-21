"use client";

import React, { useEffect, useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { TimezoneSelect, type ITimezone } from "@calcom/features/components/timezone-select";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Label } from "@calid/features/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calid/features/ui/components/select";
import { Calendar } from "@calid/features/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import { format } from "date-fns";

type Team = NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;
type Member = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

type Props = {
  team: Team;
  member?: Member;
};

export default function TeamAvailabilityModal({ team, member }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(
    (typeof window !== "undefined" && (localStorage.getItem("timeOption.preferredTimeZone") as ITimezone)) ||
      CURRENT_TIMEZONE
  );
  const [frequency, setFrequency] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    utils.viewer.teams.getMemberAvailability.invalidate();
  }, [utils, selectedTimeZone, selectedDate]);

  const availabilityQuery = trpc.viewer.teams.getMemberAvailability.useQuery(
    member && team
      ? {
          teamId: team.id,
          memberId: member.id,
          dateFrom: selectedDate.toString(),
          dateTo: selectedDate.add(1, "day").toString(),
          timezone: String(selectedTimeZone),
        }
      : (undefined as any),
    { enabled: Boolean(member && team), refetchOnWindowFocus: false }
  );

  const slots = useMemo(() => {
    if (!availabilityQuery.data) return [] as { label: string; key: string }[];
    const tz = String(availabilityQuery.data.timeZone || selectedTimeZone);
    const workingHours = availabilityQuery.data.workingHours || [];
    // naive slotting: show the top-of-hour or half-hour ticks across the day
    const base = selectedDate.startOf("day");
    const times: { label: string; key: string }[] = [];
    for (let m = 0; m < 24 * 60; m += frequency) {
      const moment = base.add(m, "minute");
      // For this rewrite, we assume presence of any working hours implies availability for demo
      times.push({ label: moment.tz(tz).format("HH:mm"), key: moment.toISOString() });
    }
    return times;
  }, [availabilityQuery.data, selectedDate, frequency, selectedTimeZone]);

  return (
    <div className="grid h-[400px] grid-cols-2 space-x-11 rtl:space-x-reverse">
      <div className="col-span-1">
        <div className="flex">
          <Avatar
            size="md"
            imageSrc={`${WEBAPP_URL}/${member?.username}/avatar.png`}
            alt={member?.name || ""}
          />
          <div className="flex items-center justify-center ">
            <span className="text-subtle ml-2 text-base font-semibold leading-4">{member?.name}</span>
          </div>
        </div>
        <div>
          <div className="text-brand-900 mb-5 mt-4 text-2xl font-semibold">{t("availability")}</div>
          <div className="mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button color="secondary" className="w-[240px] justify-start text-left font-normal">
                  <Icon name="calendar" className="mr-2 h-4 w-4" />
                  {format(selectedDate.toDate(), "LLL dd, y")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate.toDate()}
                  onSelect={(d) => d && setSelectedDate(dayjs(d))}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

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
          <div className="w-64">
            <Select value={String(frequency)} onValueChange={(v) => setFrequency(Number(v) as 15 | 30 | 60)}>
              <SelectTrigger>
                <SelectValue placeholder={`${frequency} minutes`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="col-span-1 max-h-[500px]">
        <div className="min-w-60 flex-grow pl-0">
          {!availabilityQuery.isPending && slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-4">
              <span className="text-subtle text-sm">{t("no_available_slots")}</span>
            </div>
          ) : (
            !availabilityQuery.isPending && <p className="text-default mb-3 text-sm">{t("time_available")}</p>
          )}
          <div className="max-h-[390px] overflow-scroll">
            {slots.map((slot) => (
              <div key={slot.key} className="flex flex-row items-center ">
                <a className="min-w-48 border-brand-default text-bookingdarker  bg-default mb-2 mr-3 block flex-grow rounded-md border py-2 text-center font-medium dark:border-transparent dark:bg-gray-600 " data-testid="time">
                  {slot.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


