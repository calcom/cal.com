import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";

import type { AwaitedBookingData } from "./getBookingData";

export const validateRescheduleWindow = async ({
  bookingStartTime,
  minimumReschedulingNotice,
}: {
  bookingStartTime: AwaitedBookingData["start"];
  minimumReschedulingNotice: number;
}) => {
  if (minimumReschedulingNotice === 0) return;

  const startTime = dayjs(bookingStartTime).utc();
  const currentTime = dayjs().utc();
  const timeDifferenceInMinutes = startTime.diff(currentTime, "minute");

  if (timeDifferenceInMinutes < minimumReschedulingNotice) {
    throw new Error(ErrorCode.MinimumReschedulingNoticeExceededError);
  }
};
