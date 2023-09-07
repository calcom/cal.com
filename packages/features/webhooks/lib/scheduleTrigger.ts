import type { Prisma } from "@prisma/client";
import { v4 } from "uuid";

import { getHumanReadableLocationValue } from "@calcom/core/location";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { ApiKey } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

const log = logger.getChildLogger({ prefix: ["[node-scheduler]"] });

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
    log.error(`Error creating subscription for user ${appApiKey.userId} and appId ${appApiKey.appId}.`);
  }
}

export async function deleteSubscription({
  appApiKey,
  webhookId,
  appId,
}: {
  appApiKey: ApiKey;
  webhookId: string;
  appId: string;
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
          (scheduledJob) => scheduledJob !== `${appId}_${webhook.id}`
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
    log.error(
      `Error deleting subscription for user ${appApiKey.userId}, webhookId ${webhookId}, appId ${appId}`
    );
  }
}

export async function listBookings(appApiKey: ApiKey) {
  try {
    const where: Prisma.BookingWhereInput = {};
    if (appApiKey.teamId) {
      where.eventType = {
        OR: [{ teamId: appApiKey.teamId }, { parent: { teamId: appApiKey.teamId } }],
      };
    } else {
      where.userId = appApiKey.userId;
    }
    const bookings = await prisma.booking.findMany({
      take: 3,
      where: where,
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
    log.error(`Error retrieving list of bookings for user ${appApiKey.userId} and appId ${appApiKey.appId}.`);
  }
}

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
