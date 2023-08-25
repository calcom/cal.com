import type { Prisma } from "@prisma/client";
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
  try {
    const createSubscription = await prisma.webhook.create({
      data: {
        id: v4(),
        userId: appApiKey.userId,
        teamId: appApiKey.teamId,
        eventTriggers: [triggerEvent],
        subscriberUrl,
        active: true,
        appId: appId,
      },
    });

    if (triggerEvent === WebhookTriggerEvents.MEETING_ENDED) {
      //schedule job for already existing bookings
      const where: Prisma.BookingWhereInput = {};
      if (appApiKey.teamId) where.eventType = { teamId: appApiKey.teamId };
      else where.userId = appApiKey.userId;
      const bookings = await prisma.booking.findMany({
        where: {
          ...where,
          startTime: {
            gte: new Date(),
          },
          status: BookingStatus.ACCEPTED,
        },
      });

      for (const booking of bookings) {
        scheduleTrigger(booking, createSubscription.subscriberUrl, {
          id: createSubscription.id,
          appId: createSubscription.appId,
        });
      }
    }

    return createSubscription;
  } catch (error) {
    return { error: "There was an error creating a subscription" };
  }
}

export async function deleteSubscription({
  appApiKey,
  webhookId,
  appName,
}: {
  appApiKey: ApiKey;
  webhookId: string;
  appName: string;
}) {
  try {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
      },
    });

    if (webhook?.eventTriggers.includes(WebhookTriggerEvents.MEETING_ENDED)) {
      const where: Prisma.BookingWhereInput = {};
      if (appApiKey.teamId) where.eventType = { teamId: appApiKey.teamId };
      else where.userId = appApiKey.userId;
      const bookingsWithScheduledJobs = await prisma.booking.findMany({
        where: {
          ...where,
          scheduledJobs: {
            isEmpty: false,
          },
        },
      });
      for (const booking of bookingsWithScheduledJobs) {
        const updatedScheduledJobs = booking.scheduledJobs.filter(
          (scheduledJob) => scheduledJob !== `${appName}_${webhook.id}`
        );
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            scheduledJobs: updatedScheduledJobs,
          },
        });
      }
    }

    const deleteWebhook = await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });
    if (!deleteWebhook) {
      throw new Error(`Unable to delete webhook ${webhookId}`);
    }
    return deleteWebhook;
  } catch (err) {
    return { error: "Error deleting subscription" };
  }
}
export async function listBookings(appApiKey: ApiKey) {
  try {
    const where: Prisma.BookingWhereInput = {};
    if (appApiKey.teamId) where.eventType = { teamId: appApiKey.teamId };
    else where.userId = appApiKey.userId;
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
            team: true,
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
    if (bookings.length === 0) {
      return [];
    }
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
  } catch (err) {
    return { error: "Could not retrieve bookings." };
  }
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
