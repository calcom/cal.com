import classNames from "classnames";
import React from "react";
import { ITimezone } from "react-timezone-select";

import { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import getSlots from "@calcom/lib/slots";
import { trpc } from "@calcom/trpc/react";

import SkeletonLoader from "./SkeletonLoaderAvailabilityTimes";

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
  const { t } = useLocale();

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
    <div className={classNames("min-w-60 flex-grow pl-0", props.className)}>
      {props.HeaderComponent}
      {isLoading && slots.length === 0 && <SkeletonLoader />}
      {!isLoading && slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-4">
          <span className="text-sm text-gray-500">{t("no_available_slots")}</span>
        </div>
      ) : (
        <>{!isLoading && <p className="mb-3 text-sm text-gray-600">{t("time_available")}</p>}</>
      )}
      <div className="max-h-[390px] overflow-scroll">
        {slots.map((slot) => (
          <div key={slot.time.format()} className="flex flex-row items-center ">
            <a
              className="min-w-48 border-brand text-bookingdarker dark:text-darkgray-800 mb-2 mr-3 block flex-grow rounded-md border bg-white py-2 text-center font-medium dark:border-transparent dark:bg-gray-600 "
              data-testid="time">
              {slot.time.tz(props.selectedTimeZone.toString()).format("HH:mm")}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
