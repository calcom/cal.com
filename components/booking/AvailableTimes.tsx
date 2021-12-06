import { ExclamationIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC, useMemo } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { useSlots } from "@lib/hooks/useSlots";

import Loader from "@components/Loader";

/**
 * @returns i.e. `/peer` for users or `/team/cal` for teams
 */
function useRouterBasePath() {
  const router = useRouter();
  return useMemo(() => {
    const path = router.asPath.split("/").filter(Boolean);

    // For teams
    if (path[0] === "team") {
      return `${path[0]}/${path[1]}`;
    }

    return path[0] as string;
  }, [router.asPath]);
}

type AvailableTimesProps = {
  timeFormat: string;
  minimumBookingNotice: number;
  eventTypeId: number;
  eventLength: number;
  date: Dayjs;
  users: {
    username: string | null;
  }[];
  schedulingType: SchedulingType | null;
};

const AvailableTimes: FC<AvailableTimesProps> = ({
  date,
  eventLength,
  eventTypeId,
  minimumBookingNotice,
  timeFormat,
  users,
  schedulingType,
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const { slots, loading, error } = useSlots({
    date,
    eventLength,
    schedulingType,
    users,
    minimumBookingNotice,
    eventTypeId,
  });

  const basePath = useRouterBasePath();

  return (
    <div className="flex flex-col mt-8 text-center sm:pl-4 sm:mt-0 sm:w-1/3 md:-mb-5">
      <div className="mb-4 text-lg font-light text-left text-gray-600">
        <span className="w-1/2 text-gray-600 dark:text-white">
          <strong>{t(date.format("dddd").toLowerCase())}</strong>
          <span className="text-gray-500">
            {date.format(", DD ")}
            {t(date.format("MMMM").toLowerCase())}
          </span>
        </span>
      </div>
      <div className="flex-grow md:h-[364px] overflow-y-auto">
        {!loading &&
          slots?.length > 0 &&
          slots.map((slot) => {
            const url = {
              pathname: `/${basePath}/book`,

              query: {
                type: eventTypeId,
                date: slot.time.format(),
                // conditionally add things to query params
                ...(rescheduleUid ? { rescheduleUid } : {}),
                ...(schedulingType === SchedulingType.ROUND_ROBIN ? { user: slot.users } : {}),
              },
            };
            return (
              <div key={slot.time.format()}>
                <Link href={url} as={url}>
                  <a
                    className="block py-4 mb-2 font-medium bg-white border rounded-sm dark:bg-gray-600 text-primary-500 dark:text-neutral-200 border-brand dark:border-transparent hover:text-white hover:bg-brand dark:hover:border-black dark:hover:bg-black"
                    data-testid="time">
                    {slot.time.format(timeFormat)}
                  </a>
                </Link>
              </div>
            );
          })}
        {!loading && !error && !slots.length && (
          <div className="flex flex-col items-center content-center justify-center w-full h-full -mt-4">
            <h1 className="my-6 text-xl text-black dark:text-white">{t("all_booked_today")}</h1>
          </div>
        )}

        {loading && <Loader />}

        {error && (
          <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{t("slots_load_fail")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableTimes;
