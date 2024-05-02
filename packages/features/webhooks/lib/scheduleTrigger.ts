import type { Prisma, Webhook, Booking } from "@prisma/client";
import { v4 } from "uuid";

import { getHumanReadableLocationValue } from "@calcom/core/location";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { ApiKey } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

const SCHEDULING_TRIGGER: WebhookTriggerEvents[] = [
  WebhookTriggerEvents.MEETING_ENDED,
  WebhookTriggerEvents.MEETING_STARTED,
];

const log = logger.getSubLogger({ prefix: ["[node-scheduler]"] });

//todo
export async function addSubscription({
  appApiKey,
  triggerEvent,
  subscriberUrl,
  appId,
  account,
}: {
  appApiKey?: ApiKey;
  triggerEvent: WebhookTriggerEvents;
  subscriberUrl: string;
  appId: string;
  account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null;
}) {
  try {
    const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
    const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;

    const createSubscription = await prisma.webhook.create({
      data: {
        id: v4(),
        userId,
        teamId,
        eventTriggers: [triggerEvent],
        subscriberUrl,
        active: true,
        appId: appId,
      },
    });

    if (
      triggerEvent === WebhookTriggerEvents.MEETING_ENDED ||
      triggerEvent === WebhookTriggerEvents.MEETING_STARTED
    ) {
      //schedule job for already existing bookings
      const where: Prisma.BookingWhereInput = {};
      if (teamId) {
        where.eventType = { teamId };
      } else {
        where.userId = userId;
      }
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
        scheduleTrigger(
          booking,
          createSubscription.subscriberUrl,
          {
            id: createSubscription.id,
            appId: createSubscription.appId,
          },
          triggerEvent
        );
      }
    }

    return createSubscription;
  } catch (error) {
    const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
    const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;

    log.error(
      `Error creating subscription for ${teamId ? `team ${teamId}` : `user ${userId}`}.`,
      safeStringify(error)
    );
  }
}

//done
export async function deleteSubscription({
  appApiKey,
  webhookId,
  appId,
  account,
}: {
  appApiKey?: ApiKey;
  webhookId: string;
  appId: string;
  account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null;
}) {
  try {
    if (appApiKey) {
      if (appApiKey.teamId) {
        where = { teamId: appApiKey.teamId };
      } else {
        where = appApiKey.userId;
      }
    } else if (account) {
      if (account.isTeam) {
        where = { teamId: account.id };
      } else {
        where = { userId: account.id };
      }
    }

    const deleteWebhook = await prisma.webhook.delete({
      where: {
        id: webhookId,
        ...where,
      },
    });

    if (!deleteWebhook) {
      throw new Error(`Unable to delete webhook ${webhookId}`);
    }
    return deleteWebhook;
  } catch (err) {
    const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
    const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;

    log.error(
      `Error deleting subscription for user ${
        teamId ? `team ${teamId}` : `userId ${userId}`
      }, webhookId ${webhookId}`,
      safeStringify(err)
    );
  }
}

export async function listBookings(
  appApiKey?: ApiKey,
  account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null
) {
  try {
    const where: Prisma.BookingWhereInput = {};
    if (appApiKey) {
      if (appApiKey.teamId) {
        where.eventType = {
          OR: [{ teamId: appApiKey.teamId }, { parent: { teamId: appApiKey.teamId } }],
        };
      } else {
        where.userId = appApiKey.userId;
      }
    } else if (account) {
      if (!account.isTeam) {
        where.userId = account.id;
        where.eventType = {
          teamId: null,
        };
      } else {
        where.eventType = {
          OR: [{ teamId: account.id }, { parent: { teamId: account.id } }],
        };
      }
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
    const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
    const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;

    log.error(
      `Error retrieving list of bookings for ${teamId ? `team ${teamId}` : `user ${userId}`}.`,
      safeStringify(err)
    );
  }
}

//done
export async function scheduleTrigger(
  booking: { id: number; endTime: Date; startTime: Date },
  subscriberUrl: string,
  subscriber: { id: string; appId: string | null },
  triggerEvent: WebhookTriggerEvents
) {
  try {
    const payload = JSON.stringify({ triggerEvent, ...booking });

    // add scheduled job to database
    const createTrigger = prisma.webhookScheduledTriggers.create({
      data: {
        payload,
        appId: subscriber.appId,
        startAfter: triggerEvent === WebhookTriggerEvents.MEETING_ENDED ? booking.endTime : booking.startTime,
        subscriberUrl,
        webhook: {
          connect: {
            id: subscriber.id,
          },
        },
        booking: {
          connect: {
            id: booking.id,
          },
        },
      },
    });

    await prisma.$transaction([createTrigger]);
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}

//done
export async function deleteWebhookScheduledTriggers(
  booking?: { id: number; uid: string },
  appId?: string | null,
  triggerEvent?: WebhookTriggerEvents,
  webhookId?: string,
  userId?: number,
  teamId?: number
) {
  try {
    if (appId) {
      await prisma.webhookScheduledTriggers.deleteMany({
        where: {
          appId: appId,
          booking: {
            eventType: {
              OR: [
                { userId: userId }, //does that work for managed event types?
                { teamId: teamId },
              ],
            },
          },
        },
      });
    } else {
      if (booking) {
        await prisma.webhookScheduledTriggers.deleteMany({
          where: {
            bookingId: booking.id,
          },
        });
      } else if (webhookId) {
        const where: Prisma.WebhookScheduledTriggersWhereInput = { webhookId: webhookId };

        if (triggerEvent) {
          const shouldContain = `"triggerEvent":"${triggerEvent}"`;
          where.payload = { contains: shouldContain };
        }

        await prisma.webhookScheduledTriggers.deleteMany({
          where,
        });
      }
    }
  } catch (error) {
    console.error("Error deleting webhookScheduledTriggers ", error);
  }
}

//done
export async function updateTriggerForExistingBookings(
  webhook: Webhook,
  existingEventTriggers: WebhookTriggerEvents[],
  updatedEventTriggers: WebhookTriggerEvents[]
) {
  const addedEventTriggers = updatedEventTriggers.filter(
    (trigger) => !existingEventTriggers.includes(trigger) && SCHEDULING_TRIGGER.includes(trigger)
  );
  const removedEventTriggers = existingEventTriggers.filter(
    (trigger) => !updatedEventTriggers.includes(trigger) && SCHEDULING_TRIGGER.includes(trigger)
  );

  if (addedEventTriggers.length === 0 && removedEventTriggers.length === 0) return;

  const currentTime = new Date();
  const where: Prisma.BookingWhereInput = {
    AND: [{ status: BookingStatus.ACCEPTED }],
    OR: [{ startTime: { gt: currentTime }, endTime: { gt: currentTime } }],
  };

  let bookings: Booking[] = [];

  if (Array.isArray(where.AND)) {
    if (webhook.teamId) {
      const teamEvents = await prisma.eventType.findMany({
        where: {
          teamId: webhook.teamId,
        },
        select: {
          bookings: {
            where,
          },
        },
      });

      bookings = teamEvents.flatMap((event) => event.bookings);
    } else {
      if (webhook.eventTypeId) {
        where.AND.push({ eventTypeId: webhook.eventTypeId });
      } else if (webhook.userId) {
        where.AND.push({ userId: webhook.userId });
      }

      bookings = await prisma.booking.findMany({
        where,
      });
    }
  }

  if (bookings.length === 0) return;

  if (addedEventTriggers.length > 0) {
    const promise = bookings.map((booking) => {
      return addedEventTriggers.map((trigger) => {
        scheduleTrigger(booking, webhook.subscriberUrl, webhook, trigger);
      });
    });

    await Promise.all(promise);
  }

  const promise = removedEventTriggers.map((trigger) =>
    deleteWebhookScheduledTriggers(undefined, undefined, trigger, webhook.id)
  );
  await Promise.all(promise);
}
