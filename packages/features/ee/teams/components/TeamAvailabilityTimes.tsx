import classNames from "classnames";
import React from "react";
import { ITimezone } from "react-timezone-select";

import { Dayjs } from "@calcom/dayjs";
import getSlots from "@calcom/lib/slots";
import { trpc } from "@calcom/trpc/react";
import { Loader } from "@calcom/ui";

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
  const { data, isLoading } = trpc.viewer.teams.getMemberAvailability.useQuery(
    {
      teamId: props.teamId,
      memberId: props.memberId,
      dateFrom: props.selectedDate.toString(),
      dateTo: props.selectedDate.add(1, "day").toString(),
      timezone: `${props.selectedTimeZone.toString()}`,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const slots = !isLoading
    ? getSlots({
        frequency: props.frequency,
        inviteeDate: props.selectedDate,
        workingHours: data?.workingHours || [],
        minimumBookingNotice: 0,
        eventLength: props.frequency,
      })
    : [];

  return (
    <div className={classNames("min-w-60 flex-grow p-5 pl-0", props.className)}>
      {props.HeaderComponent}
      {isLoading && slots.length === 0 && <Loader />}
      {!isLoading && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-4">
          <span className="text-sm text-gray-500">No Available Slots</span>
        </div>
      )}
      {slots.map((slot) => (
        <div key={slot.time.format()} className="flex flex-row items-center">
          <a
            className="min-w-48 border-brand text-bookingdarker hover:bg-brand hover:text-brandcontrast dark:hover:bg-darkmodebrand dark:hover:text-darkmodebrandcontrast dark:text-darkgray-800 mb-2 mr-3 block flex-grow rounded-sm border bg-white py-2 text-center font-medium dark:border-transparent dark:bg-gray-600 dark:hover:border-black dark:hover:bg-black dark:hover:text-white"
            data-testid="time">
            {slot.time.format("HH:mm")}
          </a>
        </div>
      ))}
    </div>
  );
}
