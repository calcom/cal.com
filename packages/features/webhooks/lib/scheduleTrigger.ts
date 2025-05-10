import type { Prisma, Webhook, Booking } from "@prisma/client";
import { v4 } from "uuid";

import { selectOOOEntries } from "@calcom/app-store/zapier/api/subscriptions/listOOOEntries";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getHumanReadableLocationValue } from "@calcom/lib/location";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { ApiKey } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

const SCHEDULING_TRIGGER: WebhookTriggerEvents[] = [
  WebhookTriggerEvents.MEETING_ENDED,
  WebhookTriggerEvents.MEETING_STARTED,
];

const log = logger.getSubLogger({ prefix: ["[node-scheduler]"] });

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
        where.eventType = { userId };
      }
      const bookings = await prisma.booking.findMany({
        where: {
          ...where,
          startTime: {
            gte: new Date(),
          },
          status: BookingStatus.ACCEPTED,
        },
        include: {
          eventType: {
            select: {
              bookingFields: true,
            },
          },
          attendees: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      const bookingsWithCalEventResponses = bookings.map((booking) => {
        return {
          ...booking,
          ...getCalEventResponses({
            bookingFields: booking.eventType?.bookingFields ?? null,
            booking,
          }),
        };
      });

      for (const booking of bookingsWithCalEventResponses) {
        scheduleTrigger({
          booking,
          subscriberUrl: createSubscription.subscriberUrl,
          subscriber: {
            id: createSubscription.id,
            appId: createSubscription.appId,
          },
          triggerEvent,
        });
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
  const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
  const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;
  try {
    let where: Prisma.WebhookWhereInput = {};
    if (teamId) {
      where = { teamId };
    } else {
      where = { userId };
    }

    const deleteWebhook = await prisma.webhook.delete({
      where: {
        ...where,
        appId: appId,
        id: webhookId,
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
  const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
  const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;
  try {
    const where: Prisma.BookingWhereInput = {};
    if (teamId) {
      where.eventType = {
        OR: [{ teamId }, { parent: { teamId } }],
      };
    } else {
      where.eventType = { userId };
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

export async function scheduleTrigger({
  booking,
  subscriberUrl,
  subscriber,
  triggerEvent,
  isDryRun = false,
}: {
  booking: { id: number; endTime: Date; startTime: Date };
  subscriberUrl: string;
  subscriber: { id: string; appId: string | null };
  triggerEvent: WebhookTriggerEvents;
  isDryRun?: boolean;
}) {
  if (isDryRun) return;
  try {
    const payload = JSON.stringify({ triggerEvent, ...booking });

    await prisma.webhookScheduledTriggers.create({
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
  } catch (error) {
    console.error("Error cancelling scheduled jobs", error);
  }
}

async function _deleteWebhookScheduledTriggers({
  booking,
  appId,
  triggerEvent,
  webhookId,
  userId,
  teamId,
  isDryRun = false,
}: {
  booking?: { id: number; uid: string };
  appId?: string | null;
  triggerEvent?: WebhookTriggerEvents;
  webhookId?: string;
  userId?: number;
  teamId?: number;
  isDryRun?: boolean;
}) {
  if (isDryRun) return;
  try {
    if (appId && (userId || teamId)) {
      const where: Prisma.BookingWhereInput = {};
      if (userId) {
        where.eventType = { userId };
      } else {
        where.eventType = { teamId };
      }
      await prisma.webhookScheduledTriggers.deleteMany({
        where: {
          appId: appId,
          booking: where,
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

export const deleteWebhookScheduledTriggers = withReporting(
  _deleteWebhookScheduledTriggers,
  "deleteWebhookScheduledTriggers"
);

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
      const org = await prisma.team.findFirst({
        where: {
          id: webhook.teamId,
          isOrganization: true,
        },
        select: {
          id: true,
          children: {
            select: {
              id: true,
            },
          },
          members: {
            select: {
              userId: true,
            },
          },
        },
      });
      // checking if teamId is an org id
      if (org) {
        const teamEvents = await prisma.eventType.findMany({
          where: {
            teamId: {
              in: org.children.map((team) => team.id),
            },
          },
          select: {
            bookings: {
              where,
            },
          },
        });
        const teamEventBookings = teamEvents.flatMap((event) => event.bookings);
        const teamBookingsId = teamEventBookings.map((booking) => booking.id);
        const orgMemberIds = org.members.map((member) => member.userId);
        where.AND.push({
          userId: {
            in: orgMemberIds,
          },
        });
        // don't want to get the team bookings again
        where.AND.push({
          id: {
            notIn: teamBookingsId,
          },
        });
        const userBookings = await prisma.booking.findMany({
          where,
        });
        // add teams bookings and users bookings to get total org bookings
        bookings = teamEventBookings.concat(userBookings);
      } else {
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
      }
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
      return addedEventTriggers.map((triggerEvent) => {
        if (
          triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW ||
          triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
        )
          return Promise.resolve();

        scheduleTrigger({ booking, subscriberUrl: webhook.subscriberUrl, subscriber: webhook, triggerEvent });
      });
    });

    await Promise.all(promise);
  }

  const promise = removedEventTriggers.map((triggerEvent) =>
    deleteWebhookScheduledTriggers({ triggerEvent, webhookId: webhook.id })
  );
  await Promise.all(promise);
}

export async function listOOOEntries(
  appApiKey?: ApiKey,
  account?: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null
) {
  const userId = appApiKey ? appApiKey.userId : account && !account.isTeam ? account.id : null;
  const teamId = appApiKey ? appApiKey.teamId : account && account.isTeam ? account.id : null;

  try {
    const where: Prisma.OutOfOfficeEntryWhereInput = {};
    if (teamId) {
      where.user = {
        teams: {
          some: {
            teamId,
          },
        },
      };
    } else if (userId) {
      where.userId = userId;
    }

    // early return
    if (!where.userId && !where.user) {
      return [];
    }

    const oooEntries = await prisma.outOfOfficeEntry.findMany({
      where: {
        ...where,
      },
      take: 3,
      orderBy: {
        id: "desc",
      },
      select: selectOOOEntries,
    });

    if (oooEntries.length === 0) {
      return [];
    }
    return oooEntries;
  } catch (err) {
    log.error(
      `Error retrieving list of ooo entries for user ${userId}. or teamId ${teamId}`,
      safeStringify(err)
    );
  }
}
