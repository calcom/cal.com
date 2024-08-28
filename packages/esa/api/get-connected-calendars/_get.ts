/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { connectedCalendarsHandler } from "@calcom/trpc/server/routers/loggedInViewer/connectedCalendars.handler";

async function getHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any; userId: number };

  const prisma: PrismaClient = $req.prisma;
  const userId = $req.userId || $req.query.userId;

  if (!userId) {
    throw new Error("User Id must be specified ");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
    select: {
      id: true,
      selectedCalendars: {
        select: {
          externalId: true,
          integration: true,
        },
      },
      destinationCalendar: true,
      role: true,
    },
  });

  const result = await connectedCalendarsHandler({ ctx: { user }, input: {} } as any);

  return {
    ...result,
  };
}

export default defaultResponder(getHandler);
