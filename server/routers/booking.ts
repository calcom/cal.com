import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getWorkingHours } from "@lib/availability";

import { createRouter } from "../createRouter";

export const bookingRouter = createRouter()
  .query("userEventTypes", {
    input: z.object({
      username: z
        .string()
        .min(1)
        .transform((v) => v.toLowerCase()),
    }),
    async resolve({ input, ctx }) {
      const { prisma } = ctx;
      const { username } = input;

      const user = await prisma.user.findUnique({
        where: {
          username: username.toLowerCase(),
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          bio: true,
          avatar: true,
          theme: true,
          plan: true,
        },
      });

      if (!user) {
        return null;
      }

      const eventTypesWithHidden = await prisma.eventType.findMany({
        where: {
          AND: [
            {
              teamId: null,
            },
            {
              OR: [
                {
                  userId: user.id,
                },
                {
                  users: {
                    some: {
                      id: user.id,
                    },
                  },
                },
              ],
            },
          ],
        },
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          length: true,
          description: true,
          hidden: true,
          schedulingType: true,
          price: true,
          currency: true,
        },
        take: user.plan === "FREE" ? 1 : undefined,
      });

      const eventTypes = eventTypesWithHidden.filter((evt) => !evt.hidden);

      return {
        user,
        eventTypes,
      };
    },
  })
  .query("eventTypeByUsername", {
    input: z.object({
      username: z.string().min(1),
      slug: z.string(),
      date: z.string().nullish(),
    }),
    async resolve({ input, ctx }) {
      const { prisma } = ctx;
      const { username: userParam, slug: typeParam, date: dateParam } = input;

      const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
        id: true,
        title: true,
        availability: true,
        description: true,
        length: true,
        price: true,
        currency: true,
        periodType: true,
        periodStartDate: true,
        periodEndDate: true,
        periodDays: true,
        periodCountCalendarDays: true,
        schedulingType: true,
        minimumBookingNotice: true,
        timeZone: true,
        users: {
          select: {
            avatar: true,
            name: true,
            username: true,
            hideBranding: true,
            plan: true,
            timeZone: true,
          },
        },
      });

      const user = await prisma.user.findUnique({
        where: {
          username: userParam.toLowerCase(),
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          startTime: true,
          endTime: true,
          timeZone: true,
          weekStart: true,
          availability: true,
          hideBranding: true,
          brandColor: true,
          theme: true,
          plan: true,
          eventTypes: {
            where: {
              AND: [
                {
                  slug: typeParam,
                },
                {
                  teamId: null,
                },
              ],
            },
            select: eventTypeSelect,
          },
        },
      });

      if (!user) {
        return null;
      }

      if (user.eventTypes.length !== 1) {
        const eventTypeBackwardsCompat = await prisma.eventType.findFirst({
          where: {
            AND: [
              {
                userId: user.id,
              },
              {
                slug: typeParam,
              },
            ],
          },
          select: eventTypeSelect,
        });
        if (!eventTypeBackwardsCompat) {
          return null;
        }
        eventTypeBackwardsCompat.users.push({
          avatar: user.avatar,
          name: user.name,
          username: user.username,
          hideBranding: user.hideBranding,
          plan: user.plan,
          timeZone: user.timeZone,
        });
        user.eventTypes.push(eventTypeBackwardsCompat);
      }

      const [eventType] = user.eventTypes;

      // check this is the first event

      // TEMPORARILY disabled because of a bug during event create - during which users were able
      // to create event types >n1.
      /*if (user.plan === "FREE") {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          {
            userId: user.id,
          },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    if (firstEventType?.id !== eventType.id) {
      return null;
    }
  }*/

      const eventTypeObject = Object.assign({}, eventType, {
        periodStartDate: eventType.periodStartDate?.toString() ?? null,
        periodEndDate: eventType.periodEndDate?.toString() ?? null,
      });

      const workingHours = getWorkingHours(
        {
          timeZone: eventType.timeZone || user.timeZone,
        },
        eventType.availability.length ? eventType.availability : user.availability
      );

      eventTypeObject.availability = [];

      return {
        profile: {
          name: user.name,
          image: user.avatar,
          slug: user.username,
          theme: user.theme,
          weekStart: user.weekStart,
          brandColor: user.brandColor,
        },
        date: dateParam,
        eventType: eventTypeObject,
        workingHours,
      };
    },
  });
