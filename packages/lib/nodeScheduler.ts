import { Booking } from "@prisma/client";

import prisma from "@calcom/prisma";

const schedule = require("node-schedule");

export async function scheduleTrigger(booking: Booking, subscriberUrl: string, trigger: string) {
  const job = schedule.scheduleJob(`${trigger}_${booking.uid}`, booking.endTime, async function () {
    const body = JSON.stringify(booking);
    await fetch(subscriberUrl, {
      method: "POST",
      body,
    });

    const updatedScheduledJobs = booking.scheduledJobs.filter((scheduledJob) => {
      return scheduledJob !== `${trigger}_${booking.uid}`;
    });

    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        scheduledJobs: updatedScheduledJobs,
      },
    });
  });

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      scheduledJobs: {
        push: job.name
      },
    },
  });
}

export async function cancelScheduledJobs(booking: { uid: string; scheduledJobs?: string[] }) {
  if (booking.scheduledJobs) {
    booking.scheduledJobs.forEach(async scheduledJob => {
      schedule.scheduledJobs[scheduledJob].cancel();
      await prisma.booking.update({
        where: {
          uid: booking.uid,
        },
        data: {
          scheduledJobs: [],
        },
      });
    })

  }
}
