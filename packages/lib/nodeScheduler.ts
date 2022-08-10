import { Booking } from "@prisma/client";

import prisma from "@calcom/prisma";

const schedule = require("node-schedule");

export async function scheduleTrigger(
  booking: {id: number, endTime: Date, scheduledJobs: string[]},
  subscriberUrl: string,
  subscriber: { id: string; appId: string | null }
) {
  const job = schedule.scheduleJob(
    `${subscriber.appId}_${subscriber.id}`,
    booking.endTime,
    async function () {
      const body = JSON.stringify(booking);
      await fetch(subscriberUrl, {
        method: "POST",
        body,
      });

      const updatedScheduledJobs = booking.scheduledJobs.filter((scheduledJob) => {
        return scheduledJob !== `${subscriber.appId}_${subscriber.id}`;
      });

      await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          scheduledJobs: updatedScheduledJobs,
        },
      });
    }
  );

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      scheduledJobs: {
        push: job.name,
      },
    },
  });
}

export async function cancelScheduledJobs(
  booking: { uid: string; scheduledJobs?: string[] },
  appId?: string | null
) {
  let scheduledJobs = booking.scheduledJobs || [];
  if (booking.scheduledJobs) {
    booking.scheduledJobs.forEach(async (scheduledJob) => {
      if (appId) {
        if (scheduledJob.startsWith(appId)) {
          if (schedule.scheduledJobs[scheduledJob]) {
            schedule.scheduledJobs[scheduledJob].cancel();
          }
          scheduledJobs = scheduledJobs?.filter((job) => scheduledJob !== job) || [];
        }
      } else {
        //if no specific appId given, delete all scheduled Jobs of booking
        if (schedule.scheduledJobs[scheduledJob]) {
          schedule.scheduledJobs[scheduledJob].cancel();
        }
        scheduledJobs = [];
      }

      await prisma.booking.update({
        where: {
          uid: booking.uid,
        },
        data: {
          scheduledJobs: scheduledJobs,
        },
      });
    });
  }
}
