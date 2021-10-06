import { z } from "zod";

import { createRouter } from "../createRouter";

export const bookingRouter = createRouter().query("userEventTypes", {
  input: z.object({
    username: z.string().min(1),
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
});
