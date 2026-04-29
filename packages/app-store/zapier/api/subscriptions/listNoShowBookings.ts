import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { account: authorizedAccount, appApiKey: validKey } = await validateAccountOrApiKey(req, [
    "READ_BOOKING",
  ]);

  const userId = validKey ? validKey.userId : authorizedAccount && !authorizedAccount.isTeam ? authorizedAccount.id : null;
  const teamId = validKey ? validKey.teamId : authorizedAccount && authorizedAccount.isTeam ? authorizedAccount.id : null;

  const where = teamId
    ? {
        eventType: {
          OR: [{ teamId }, { parent: { teamId } }],
        },
        OR: [{ noShowHost: true }, { attendees: { some: { noShow: true } } }],
      }
    : {
        eventType: { userId },
        OR: [{ noShowHost: true }, { attendees: { some: { noShow: true } } }],
      };

  const noShowBookings = await prisma.booking.findMany({
    take: 3,
    where,
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      uid: true,
      title: true,
      description: true,
      customInputs: true,
      responses: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      updatedAt: true,
      location: true,
      cancellationReason: true,
      status: true,
      metadata: true,
      noShowHost: true,
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
          noShow: true,
        },
      },
    },
  });

  if (noShowBookings.length === 0) {
    return res.status(200).json([]);
  }

  return res.status(200).json(
    noShowBookings.map((booking) => ({
      createdAt: booking.updatedAt ?? booking.createdAt,
      triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      payload: {
        booking,
      },
    }))
  );
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
