import { Booking } from "@prisma/client";

import prisma from "@calcom/prisma";

const schedule = require("node-schedule");

export async function scheduleZapierTrigger(booking: Booking, subscriberUrl: string) {
  const job = schedule.scheduleJob(
    `zapier_meeting_ended_${booking.uid}`,
    booking.endTime,
    async function () {
      const body = JSON.stringify(booking);
      await fetch(subscriberUrl, {
        method: "POST",
        body,
      });

      await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          scheduledJob:  null
        },
      });
    }
  );

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      scheduledJob:  job.name
    },
  });
}

export function cancelScheduledTriggerJobs(booking: Booking) {
  if (booking.scheduledJob) {
    schedule.scheduledJobs[booking.scheduledJob].cancel();
    prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        scheduledJob: undefined,
      },
    });
  }
}
