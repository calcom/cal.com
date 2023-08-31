import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

export async function scheduleTrigger(
  booking: { id: number; endTime: Date; scheduledJobs: string[] },
  subscriberUrl: string,
  subscriber: { id: string; appId: string | null }
) {
  try {
    const payload = JSON.stringify({ triggerEvent: WebhookTriggerEvents.MEETING_ENDED, ...booking });
    const jobName = `${subscriber.appId}_${subscriber.id}`;

    // add scheduled job to database
    const createTrigger = prisma.webhookScheduledTriggers.create({
      data: {
        jobName,
        payload,
        startAfter: booking.endTime,
        subscriberUrl,
      },
    });

    //add scheduled job name to booking
    const updateBooking = prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        scheduledJobs: {
          push: jobName,
        },
      },
    });

    await prisma.$transaction([createTrigger, updateBooking]);
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}

export async function cancelScheduledJobs(
  booking: { uid: string; scheduledJobs?: string[] },
  appId?: string | null,
  isReschedule?: boolean
) {
  if (!booking.scheduledJobs) return;

  let scheduledJobs = booking.scheduledJobs || [];
  const promises = booking.scheduledJobs.map(async (scheduledJob) => {
    if (appId) {
      if (scheduledJob.startsWith(appId)) {
        await prisma.webhookScheduledTriggers.deleteMany({
          where: {
            jobName: scheduledJob,
          },
        });
        scheduledJobs = scheduledJobs?.filter((job) => scheduledJob !== job) || [];
      }
    } else {
      //if no specific appId given, delete all scheduled jobs of booking
      await prisma.webhookScheduledTriggers.deleteMany({
        where: {
          jobName: scheduledJob,
        },
      });
      scheduledJobs = [];
    }

    if (!isReschedule) {
      await prisma.booking.update({
        where: {
          uid: booking.uid,
        },
        data: {
          scheduledJobs: scheduledJobs,
        },
      });
    }
  });

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}
