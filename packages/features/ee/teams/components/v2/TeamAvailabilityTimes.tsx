import classNames from "classnames";
import React from "react";
import { ITimezone } from "react-timezone-select";

import { Dayjs } from "@calcom/dayjs";
import getSlots from "@calcom/lib/slots";
import { trpc } from "@calcom/trpc/react";
import { Loader } from "@calcom/ui/v2";

interface Props {
  teamId: number;
  memberId: number;
  selectedDate: Dayjs;
  selectedTimeZone: ITimezone;
  frequency: number;
  HeaderComponent?: React.ReactNode;
  className?: string;
}

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
        eventLength: props.frequency,
      })
    : [];

  return (
    <div className={classNames("min-w-60 flex-grow pl-0", props.className)}>
      {props.HeaderComponent}
      {isLoading && times.length === 0 && <Loader />}
      {!isLoading && times.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-4">
          <span className="text-sm text-gray-500">No Available slots</span>
        </div>
      ) : (
        <>{!isLoading && <p className="mb-3 text-sm text-gray-600">Time available</p>}</>
      )}
      <div className="max-h-[390px] overflow-scroll">
        {times.map((time) => (
          <div key={time.format()} className="flex flex-row items-center ">
            <a
              className="min-w-48 border-brand text-bookingdarker mb-2 mr-3 block flex-grow rounded-md border bg-white py-2 text-center font-medium dark:border-transparent dark:bg-gray-600 dark:text-neutral-200 "
              data-testid="time">
              {time.tz(props.selectedTimeZone.toString()).format("HH:mm")}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
