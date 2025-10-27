import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { isSupportedTimeZone } from "@calcom/lib/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { createContext } from "@calcom/trpc/server/createContext";
import { getScheduleSchema } from "@calcom/trpc/server/routers/viewer/slots/types";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

// Apply plugins
dayjs.extend(utc);
dayjs.extend(timezone);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { usernameList, isTeamEvent, ...rest } = req.query;
    const parsedIsTeamEvent = String(isTeamEvent).toLowerCase() === "true";
    let slugs = usernameList;
    if (!Array.isArray(usernameList)) {
      slugs = usernameList ? [usernameList] : undefined;
    }
    const input = getScheduleSchema.parse({ usernameList: slugs, isTeamEvent: parsedIsTeamEvent, ...rest });
    const timeZoneSupported = input.timeZone ? isSupportedTimeZone(input.timeZone) : false;

    const availableSlotsService = getAvailableSlotsService();
    const availableSlots = await availableSlotsService.getAvailableSlots({
      ctx: await createContext({ req, res }),
      input,
    });

    const slotsInProvidedTimeZone = timeZoneSupported
      ? Object.keys(availableSlots.slots).reduce(
          (acc: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>, date) => {
            acc[date] = availableSlots.slots[date].map((slot) => ({
              ...slot,
              time: dayjs(slot.time).tz(input.timeZone).format(),
            }));
            return acc;
          },
          {}
        )
      : availableSlots.slots;

    return { slots: slotsInProvidedTimeZone };
     
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(cause);
      throw new HttpError({ statusCode, message: cause.message });
    }
    throw cause;
  }
}

export default defaultResponder(handler);
