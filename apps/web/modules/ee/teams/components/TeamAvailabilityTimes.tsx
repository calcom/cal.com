/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import type { Dayjs } from "@calcom/dayjs";
import getSlots from "@calcom/features/schedules/lib/slots";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
/* eslint-enable @typescript-eslint/ban-ts-comment */
// TODO: Currently this file is not type checked as it's deprecated
//       it must be refactored if we want to restore TeamAvailability
import classNames from "classnames";
import type React from "react";
import type { ITimezone } from "react-timezone-select";
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

  const { data, isPending } = trpc.viewer.teams.getMemberAvailability.useQuery(
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

  const slots = !isPending
    ? getSlots({
        frequency: props.frequency,
        inviteeDate: props.selectedDate,
        workingHours: data?.workingHours || [],
        minimumBookingNotice: 0,
        offsetStart: 0,
        eventLength: props.frequency,
        organizerTimeZone: `${data?.timeZone}`,
      })
    : [];

  return (
    <div className={classNames("min-w-60 grow pl-0", props.className)}>
      {props.HeaderComponent}
      {isPending && slots.length === 0 && <SkeletonLoader />}
      {!isPending && slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-4">
          <span className="text-subtle text-sm">{t("no_available_slots")}</span>
        </div>
      ) : (
        <>{!isPending && <p className="text-default mb-3 text-sm">{t("time_available")}</p>}</>
      )}
      <div className="max-h-[390px] overflow-scroll">
        {slots.map((slot) => (
          <div key={slot.time.format()} className="flex flex-row items-center ">
            <a
              className="min-w-48 border-brand-default text-bookingdarker  bg-default mb-2 mr-3 block grow rounded-md border py-2 text-center font-medium dark:border-transparent dark:bg-gray-600 "
              data-testid="time">
              {slot.time.tz(props.selectedTimeZone.toString()).format("HH:mm")}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
