"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { DateRangePicker } from "@calcom/ui";

export const StartTimeFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: query } = useFilterQuery();

  const [afterStartDate, setAfterStartDate] = useState<Dayjs | undefined>(undefined);
  const [beforeEndDate, setBeforeEndDate] = useState<Dayjs | undefined>(undefined);

  const startValue = afterStartDate?.toDate();
  const endValue = beforeEndDate?.toDate();

  const updatedUrlParams = (newStartDate: Dayjs, newEndDate: Dayjs) => {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        search.set(key, value.join(","));
      } else if (value) {
        search.set(key, String(value));
      }
    });

    search.set("afterStartDate", newStartDate.subtract(1, "day").format("YYYY-MM-DD"));
    search.set("beforeEndDate", newEndDate.add(1, "day").format("YYYY-MM-DD"));
    router.replace(`${pathname}?${search.toString()}`);
  };

  return (
    <div>
      <DateRangePicker
        minDate={null}
        dates={{ startDate: startValue, endDate: endValue }}
        onDatesChange={(values) => {
          const newAfterStartDate = values.startDate ? dayjs(values.startDate) : undefined;
          const newBeforeEndDate = values.endDate ? dayjs(values.endDate) : undefined;
          setAfterStartDate(newAfterStartDate);
          setBeforeEndDate(newBeforeEndDate);

          if (newAfterStartDate && newBeforeEndDate) {
            updatedUrlParams(newAfterStartDate, newBeforeEndDate);
          }
        }}
      />
    </div>
  );
};
