/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const selectedCalendarSelectSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.number().optional(),
});

async function getHandler(req: NextApiRequest & { prisma: any; userId: number }) {
  const prisma: PrismaClient = req.prisma;
  const userId = req.userId;

  const userWithCredentials = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
      timeZone: true,
      id: true,
      selectedCalendars: true,
    },
  });
  if (!userWithCredentials) {
    throw new Error("User not found");
  }
  const { ...user } = userWithCredentials;

  if (req.method === "POST") {
    const { integration, externalId, credentialId } = selectedCalendarSelectSchema.parse(req.body);
    await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId: user.id,
          integration,
          externalId,
        },
      },
      create: {
        userId: user.id,
        integration,
        externalId,
        credentialId,
      },
      // already exists
      update: {},
    });
    return { message: "Calendar Selection Saved" };
  }

  if (req.method === "DELETE") {
    const { integration, externalId } = selectedCalendarSelectSchema.parse(req.query);
    await prisma.selectedCalendar.delete({
      where: {
        userId_integration_externalId: {
          userId: user.id,
          externalId,
          integration,
        },
      },
    });

    return { message: "Calendar Selection Saved" };
  }
}

export default defaultResponder(getHandler);
