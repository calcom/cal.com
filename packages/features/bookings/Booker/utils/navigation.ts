import { useRouter } from "next/router";
import z from "zod";

import dayjs from "@calcom/dayjs";

const bookerQuery = z.object({
  user: z.string(),
  type: z.string(),
  month: z.string().optional(),
  date: z.string().optional(),
  slot: z.string().optional(),
  rescheduleUid: z.string().optional(),
  duration: z.string().optional(),
});

export const useBookerNavigation = () => {
  const { query, push, back, replace } = useRouter();
  const {
    user: username,
    type: eventSlug,
    month,
    date,
    duration,
    slot,
    rescheduleUid,
  } = bookerQuery.parse(query);

  const updateQuery = (newQuery: Partial<z.infer<typeof bookerQuery>>) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    for (const param in newQuery) {
      const value = newQuery[param as keyof typeof newQuery];
      if (value) url.searchParams.set(param, `${value}`);
      else url.searchParams.delete(param);
    }

    return push(url, url, { shallow: true });
  };

  const replaceQuery = (newQuery: Partial<z.infer<typeof bookerQuery>>) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    for (const param in newQuery) {
      url.searchParams.set(param, `${newQuery[param as keyof typeof newQuery]}`);
    }

    return replace(url, url, { shallow: true });
  };

  const addToSelectedDate = (days: number) => {
    const currentSelection = dayjs(date);
    const newSelection = currentSelection.add(days, "day");
    const newQuery: Partial<z.infer<typeof bookerQuery>> = { date: newSelection.format("YYYY-MM-DD") };
    if (newSelection.month() !== currentSelection.month()) {
      newQuery.month = newSelection.format("YYYY-MM");
    }

    updateQuery(newQuery);
  };

  return {
    username,
    month,
    eventSlug,
    date,
    slot,
    duration: duration ? parseInt(duration) : null,
    rescheduleUid,
    addToSelectedDate,
    updateQuery,
    replaceQuery,
    back,
  };
};
