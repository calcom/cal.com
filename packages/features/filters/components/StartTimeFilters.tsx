"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { DateRangePicker } from "@calcom/ui";

export const StartTimeFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: query } = useFilterQuery();

  const getQueryDate = (param: string) =>
    searchParams?.get(param) ? dayjs(searchParams?.get(param)) : undefined;

  const [afterStartDate, setAfterStartDate] = useState<Dayjs | undefined>(() =>
    getQueryDate("afterStartDate")
  );
  const [beforeEndDate, setBeforeEndDate] = useState<Dayjs | undefined>(() => getQueryDate("beforeEndDate"));

  const startValue = afterStartDate?.toDate();
  const endValue = beforeEndDate?.toDate();

  const updateUrlParams = (newStartDate: Dayjs, newEndDate: Dayjs) => {
    const search = new URLSearchParams(searchParams?.toString());

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "afterStartDate" && key !== "beforeEndDate") {
        search.set(key, String(value));
      }
    });

    if (newStartDate) {
      search.set("afterStartDate", newStartDate.startOf("day").format("YYYY-MM-DDTHH:mm:ss"));
    }
    if (newEndDate) {
      search.set("beforeEndDate", newEndDate.endOf("day").format("YYYY-MM-DDTHH:mm:ss"));
    }

    router.replace(`${pathname}?${search.toString()}`);
  };

  useEffect(() => {
    //if params has date range
    if (searchParams?.has("afterStartDate") && searchParams?.has("beforeEndDate")) {
      setAfterStartDate(getQueryDate("afterStartDate"));
      setBeforeEndDate(getQueryDate("beforeEndDate"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(query).length === 1 && "status" in query && afterStartDate && beforeEndDate) {
      setAfterStartDate(undefined);
      setBeforeEndDate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <DateRangePicker
      minDate={null}
      dates={{ startDate: startValue, endDate: endValue }}
      onDatesChange={(values) => {
        const newAfterStartDate = values.startDate ? dayjs(values.startDate) : undefined;
        const newBeforeEndDate = values.endDate ? dayjs(values.endDate) : undefined;
        setAfterStartDate(newAfterStartDate);
        setBeforeEndDate(newBeforeEndDate);

        if (newAfterStartDate && newBeforeEndDate) {
          updateUrlParams(newAfterStartDate, newBeforeEndDate);
        }
      }}
    />
  );
};
