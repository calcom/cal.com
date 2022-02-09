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
  if (req.method == "POST") {
    const userResult = await fetch("https://api.calendly.com/users/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + req.body.token,
      },
    });

    if (userResult.status == 200) {
      const userData = await userResult.json();

      await prisma.user.update({
        where: {
          id: authenticatedUser.id,
        },
        data: {
          name: userData.resource.name,
        },
      });

      const eventTypesResult = await fetch(
        "https://api.calendly.com/event_types?user=" + userData.resource.uri,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + req.body.token,
          },
        }
      );

      const eventTypesData = await eventTypesResult.json();

      eventTypesData.collection.forEach(async (eventType: any) => {
        await prisma.eventType.create({
          data: {
            title: eventType.name,
            slug: eventType.slug,
            length: eventType.duration,
            description: eventType.description_plain,
            hidden: eventType.secret,
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
