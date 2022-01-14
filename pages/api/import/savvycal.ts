import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  const authenticatedUser = await prisma.user.findFirst({
    rejectOnNotFound: true,
    where: {
      id: session?.user.id,
    },
    select: {
      id: true,
    },
  });
  if (req.method === "POST") {
    const userResult = await fetch("https://api.savvycal.com/v1/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + req.body.token,
      },
    });

    if (userResult.status === 200) {
      const userData = await userResult.json();

      await prisma.user.update({
        where: {
          id: authenticatedUser.id,
        },
        data: {
          name: userData.display_name,
          timeZone: userData.time_zone,
          weekStart: userData.first_day_of_week === 0 ? "Sunday" : "Monday",
          avatar: userData.avatar_url,
        },
      });

      const eventTypesResult = await fetch("https://api.savvycal.com/v1/links?limit=100", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + req.body.token,
        },
      });

      const eventTypesData = await eventTypesResult.json();

      eventTypesData.entries.forEach(async (eventType: any) => {
        await prisma.eventType.create({
          data: {
            title: eventType.name,
            slug: eventType.slug,
            length: eventType.durations[0],
            description: eventType.description.replace(/<[^>]*>?/gm, ""),
            hidden: eventType.state === "active" ? true : false,
            users: {
              connect: {
                id: authenticatedUser.id,
              },
            },
            userId: authenticatedUser.id,
          },
        });
      });

      res.status(201).end();
    } else {
      res.status(500).end();
    }
  } else {
    res.status(405).end();
  }
}
