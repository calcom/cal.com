import { NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";

export const revalidateCalendarCache = (
  revalidate: NextApiResponse["revalidate"],
  username: string,
  monthsToRevalidate = 4
): Promise<void[]> => {
  return Promise.all(
    new Array(monthsToRevalidate).fill(0).map((_, index): Promise<void> => {
      const date = dayjs().add(index, "month").format("YYYY-MM");
      const url = `/${username}/calendar-cache/${date}`;
      console.log("revalidating", url);
      return revalidate(url);
    })
  );
};
