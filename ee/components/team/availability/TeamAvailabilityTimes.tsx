import classNames from "classnames";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React from "react";
import { ITimezone } from "react-timezone-select";

import getSlots from "@lib/slots";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";

interface Props {
  teamId: number;
  memberId: number;
  selectedDate: Dayjs;
  selectedTimeZone: ITimezone;
  frequency: number;
  HeaderComponent?: React.ReactNode;
  className?: string;
}

dayjs.extend(utc);

export default function TeamAvailabilityTimes(props: Props) {
  const { data, isLoading } = trpc.useQuery(
    [
      "viewer.teams.getMemberAvailability",
      {
        teamId: props.teamId,
        memberId: props.memberId,
        dateFrom: props.selectedDate.toString(),
        dateTo: props.selectedDate.add(1, "day").toString(),
        timezone: `${props.selectedTimeZone.toString()}`,
      },
    ],
    {
      refetchOnWindowFocus: false,
    }
  );

  const times = !isLoading
    ? getSlots({
        frequency: props.frequency,
        inviteeDate: props.selectedDate,
        workingHours: data?.workingHours || [],
        minimumBookingNotice: 0,
      })
    : [];

  return (
    <div className={classNames("flex-grow p-5 pl-0 min-w-60", props.className)}>
      {props.HeaderComponent}
      {isLoading && times.length === 0 && <Loader />}
      {!isLoading && times.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-4">
          <span className="text-sm text-gray-500">No Available Slots</span>
        </div>
      )}
      {times.map((time) => (
        <div key={time.format()} className="flex flex-row items-center">
          <a
            className="flex-grow block py-2 mb-2 mr-3 font-medium text-center bg-white border rounded-sm min-w-48 dark:bg-gray-600 text-primary-500 dark:text-neutral-200 border-brand dark:border-transparent hover:bg-brand hover:text-brandcontrast dark:hover:border-black dark:hover:text-white dark:hover:bg-black"
            data-testid="time">
            {time.format("HH:mm")}
          </a>
        </div>
      ))}
    </div>
  );
}
