import type { NextApiResponse } from "next";

export const revalidateCalendarCache = (
  revalidate: NextApiResponse["revalidate"],
  username: string,
  monthsToRevalidate = 4
): Promise<void[]> => {
  return true;
};
