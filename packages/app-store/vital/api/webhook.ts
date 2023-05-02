import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
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
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const sig = req.headers["svix-signature"];
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing svix-signature" });
    }

    const vitalClient = await initVitalClient();

    if (!vitalClient || !vitalEnv)
      return res.status(400).json({ message: "Missing vital client, try calling `initVitalClient`" });

    const payload = JSON.stringify(req.body);

    const event: any = vitalClient.Webhooks.constructWebhookEvent(
      payload,
      req.headers as Record<string, string>,
      vitalEnv.webhook_secret as string
    );

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
            return res.status(404).json({ message: "Missing vital credential" });
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
            res.status(404).json({ message: "Vital configuration not found for user" });
            return;
          }

          if (!event.data.hasOwnProperty(parameterFilter)) {
            res.status(500).json({ message: "Selected param not available" });
            return;
          }
          const totalHoursSleep = event.data[parameterFilter] / 60 / 60;

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
    return res.status(200).json({ body: req.body });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}
