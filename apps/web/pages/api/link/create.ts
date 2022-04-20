import { Prisma, User } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { DisposableLinkCreateBody } from "@lib/types/booking";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const translator = short();

  const session = await getSession({ req: req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const currentUser = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      credentials: {
        orderBy: { id: "desc" as Prisma.SortOrder },
      },
      availability: true,
      timeZone: true,
      email: true,
      name: true,
      username: true,
      destinationCalendar: true,
      locale: true,
    },
  });

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const reqBody = req.body as DisposableLinkCreateBody;
  const eventTypeId = reqBody.eventTypeId as number;

  // fetch eventType
  if (!eventTypeId) {
    return res.status(404).json({ message: "Event type not found" });
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
    },
  });

  if (!eventType?.id) {
    return res.status(404).json({ message: "Event type not found" });
  }

  const seed = `${currentUser.username}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  // create a disposable link
  const link = await prisma.hashedLink.create({
    data: {
      link: uid,
      eventType: {
        connect: { id: eventTypeId },
      },
    },
  });

  res.status(204).end();
}
