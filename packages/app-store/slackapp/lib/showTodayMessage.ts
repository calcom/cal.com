import { BookingStatus } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

import { WhereCredsEqualsId } from "./WhereCredsEqualsID";
import { NoUserMessage, TodayMessage } from "./views";

export default async function showCreateEventMessage(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;

  const foundUser = await prisma.credential.findFirst({
    ...WhereCredsEqualsId(body.user_id),
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!foundUser) res.status(200).json(NoUserMessage);
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        {
          userId: foundUser?.userId,
        },
        {
          attendees: {
            some: {
              email: foundUser?.user?.email,
            },
          },
        },
      ],
      AND: [
        {
          endTime: { gte: new Date() },
          AND: [
            { NOT: { status: { equals: BookingStatus.CANCELLED } } },
            { NOT: { status: { equals: BookingStatus.REJECTED } } },
          ],
        },
      ],
    },
  });

  res.status(200).json(TodayMessage(bookings));
}
