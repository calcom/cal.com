import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import queue from "queue";

import dayjs from "@calcom/dayjs";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { Reschedule } from "../lib";
import { initVitalClient, vitalEnv } from "../lib/client";

interface EventType {
  event_type: string;
  data: {
    [key: string]: string | number;
  };
}

/* @Note: not being used anymore but left as example
const getOuraSleepScore = async (user_id: string, bedtime_start: Date) => {
  const vitalClient = await initVitalClient();
  if (!vitalClient) throw Error("Missing vital client");
  const sleep_data = await vitalClient.Sleep.get_raw(user_id, bedtime_start, undefined, "oura");
  if (sleep_data.sleep.length === 0) {
    throw Error("No sleep score found");
  }
  return +sleep_data.sleep[0].data.score;
};
*/

/**
 * This is will generate a user token for a client_user_id`
 * @param req
 */
export default async function handler(req: NextRequest) {
  try {
    const sig = req.headers.get("svix-signature");
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing svix-signature" });
    }

    const vitalClient = await initVitalClient();

    if (!vitalClient || !vitalEnv)
      return NextResponse.json(
        { message: "Missing vital client, try calling `initVitalClient`" },
        { status: 400 }
      );

    const body = await req.json();
    const payload = JSON.stringify(body);

    const event: EventType = vitalClient.Webhooks.constructWebhookEvent(
      payload,
      Object.fromEntries(req.headers.entries()),
      vitalEnv.webhook_secret as string
    ) as EventType;

    if (event.event_type == "daily.data.sleep.created") {
      // Carry out logic here to determine what to do if sleep is less
      // than 8 hours or readiness score is less than 70
      try {
        if (event.data.user_id) {
          const json = { userVitalId: event.data.user_id as string };
          const credential = await prisma.credential.findFirstOrThrow({
            where: {
              type: "vital_other",
              key: {
                equals: json,
              },
            },
          });
          if (!credential) {
            return NextResponse.json({ message: "Missing vital credential" }, { status: 404 });
          }

          // Getting total hours of sleep seconds/60/60 = hours
          const userWithMetadata = await prisma.user.findFirst({
            select: {
              metadata: true,
            },
            where: {
              id: credential.userId as number,
            },
          });
          let minimumSleepTime = 0;
          let parameterFilter = "";
          const userMetadata = userWithMetadata?.metadata as Prisma.JsonObject;
          const vitalSettings =
            ((userWithMetadata?.metadata as Prisma.JsonObject)?.vitalSettings as Prisma.JsonObject) || {};
          if (!!userMetadata && !!vitalSettings) {
            minimumSleepTime = vitalSettings.sleepValue as number;
            parameterFilter = vitalSettings.parameter as string;
          } else {
            return NextResponse.json({ message: "Vital configuration not found for user" }, { status: 404 });
          }

          if (!event.data.hasOwnProperty(parameterFilter)) {
            return NextResponse.json({ message: "Selected param not available" }, { status: 500 });
          }
          const totalHoursSleep = Number(event.data[parameterFilter]) / 60 / 60;

          if (minimumSleepTime > 0 && parameterFilter !== "" && totalHoursSleep <= minimumSleepTime) {
            // Trigger reschedule
            try {
              const todayDate = dayjs();
              const todayBookings = await prisma.booking.findMany({
                where: {
                  startTime: {
                    gte: todayDate.startOf("day").toISOString(),
                  },
                  endTime: {
                    lte: todayDate.endOf("day").toISOString(),
                  },
                  status: {
                    in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
                  },
                  // @NOTE: very important filter
                  userId: credential?.userId,
                },
                select: {
                  id: true,
                  uid: true,
                  userId: true,
                  status: true,
                },
              });

              const q = queue({ results: [] });
              if (todayBookings.length > 0) {
                todayBookings.forEach((booking) =>
                  q.push(() => {
                    return Reschedule(booking.uid, "");
                  })
                );
              }
              await q.start();
            } catch (error) {
              throw new Error("Failed to reschedule bookings");
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        logger.error("Failed to get sleep score");
      }
    }
    return NextResponse.json({ body });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      {
        message: err.message,
        stack: IS_PRODUCTION ? undefined : err.stack,
      },
      { status: err.statusCode ?? 500 }
    );
  }
}
