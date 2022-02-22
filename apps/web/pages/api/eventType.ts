import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    id: true,
    title: true,
    description: true,
    length: true,
    schedulingType: true,
    slug: true,
    hidden: true,
    price: true,
    currency: true,
    metadata: true,
    users: {
      select: {
        id: true,
        avatar: true,
        name: true,
      },
    },
  });

  const user = await prisma.user.findUnique({
    rejectOnNotFound: true,
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      avatar: true,
      completedOnboarding: true,
      createdDate: true,
      plan: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              members: {
                select: {
                  userId: true,
                },
              },
              eventTypes: {
                select: eventTypeSelect,
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          team: null,
        },
        select: eventTypeSelect,
      },
    },
  });

  // backwards compatibility, TMP:
  const typesRaw = await prisma.eventType.findMany({
    where: {
      userId: session.user.id,
    },
    select: eventTypeSelect,
  });

  type EventTypeGroup = {
    teamId?: number | null;
    profile?: {
      slug: typeof user["username"];
      name: typeof user["name"];
      image: typeof user["avatar"];
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
    eventTypes: (typeof user.eventTypes[number] & { $disabled?: boolean })[];
  };

  const eventTypesHashMap = user.eventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
    const oldItem = hashMap[newItem.id] || {};
    hashMap[newItem.id] = { ...oldItem, ...newItem };
    return hashMap;
  }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
  const mergedEventTypes = Object.values(eventTypesHashMap).map((et, index) => ({
    ...et,
    $disabled: user?.plan === "FREE" && index > 0,
  }));

  return res.status(200).json({ eventTypes: mergedEventTypes });
}
