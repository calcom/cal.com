import schedule from "node-schedule";
import { v4 } from "uuid";

import { getHumanReadableLocationValue } from "@calcom/core/location";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { ApiKey } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

export async function addSubscription({
  appApiKey,
  triggerEvent,
  subscriberUrl,
  appId,
}: {
  appApiKey: ApiKey;
  triggerEvent: WebhookTriggerEvents;
  subscriberUrl: string;
  appId: string;
}) {
  const createSubscription = await prisma.webhook.create({
    data: {
      id: v4(),
      userId: appApiKey.userId,
      eventTriggers: [triggerEvent],
      subscriberUrl,
      active: true,
      appId: appId,
    },
  });
  console.log("createSubscription", createSubscription);
  if (triggerEvent === WebhookTriggerEvents.MEETING_ENDED) {
    //schedule job for already existing bookings
    const bookings = await prisma.booking.findMany({
      where: {
        userId: appApiKey.userId,
        startTime: {
          gte: new Date(),
        },
        status: BookingStatus.ACCEPTED,
      },
    });

    for (const booking of bookings) {
      console.log("booking", booking);
      scheduleTrigger(booking, createSubscription.subscriberUrl, {
        id: createSubscription.id,
        appId: createSubscription.appId,
      });
    }
  }
  if (!createSubscription) {
    throw new Error(`Unable to create a webhook for app ${appId} for the event ${triggerEvent}`);
  }
  return createSubscription;
}

export async function listBookings(appApiKey: ApiKey) {
  const bookings = await prisma.booking.findMany({
    take: 3,
    where: {
      userId: appApiKey.userId,
    },
    orderBy: {
      id: "desc",
    },
    select: {
      title: true,
      description: true,
      customInputs: true,
      responses: true,
      startTime: true,
      endTime: true,
      location: true,
      cancellationReason: true,
      status: true,
      user: {
        select: {
          username: true,
          name: true,
          email: true,
          timeZone: true,
          locale: true,
        },
      },
      eventType: {
        select: {
          title: true,
          description: true,
          requiresConfirmation: true,
          price: true,
          currency: true,
          length: true,
          bookingFields: true,
        },
      },
      attendees: {
        select: {
          name: true,
          email: true,
          timeZone: true,
        },
      },
    },
  });

  const t = await getTranslation(bookings[0].user?.locale ?? "en", "common");

  const updatedBookings = bookings.map((booking) => {
    return {
      ...booking,
      ...getCalEventResponses({
        bookingFields: booking.eventType?.bookingFields ?? null,
        booking,
      }),
      location: getHumanReadableLocationValue(booking.location || "", t),
    };
  });

  return updatedBookings;
}

export async function scheduleTrigger(
  booking: { id: number; endTime: Date; scheduledJobs: string[] },
  subscriberUrl: string,
  subscriber: { id: string; appId: string | null }
) {
  try {
    //schedule job to call subscriber url at the end of meeting
    const job = schedule.scheduleJob(
      `${subscriber.appId}_${subscriber.id}`,
      booking.endTime,
      async function () {
        const body = JSON.stringify(booking);
        await fetch(subscriberUrl, {
          method: "POST",
          body,
        });

        //remove scheduled job from bookings once triggered
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

    //add scheduled job name to booking
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
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}

export async function cancelScheduledJobs(
  booking: { uid: string; scheduledJobs?: string[] },
  appId?: string | null,
  isReschedule?: boolean
) {
  try {
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
          //if no specific appId given, delete all scheduled jobs of booking
          if (schedule.scheduledJobs[scheduledJob]) {
            schedule.scheduledJobs[scheduledJob].cancel();
          }
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
    }
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}
