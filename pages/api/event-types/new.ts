import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

interface Body {
  userId: string;

  newOrganization: {
    name: string;
    users: string[];
  };
}
type Data = {
  event?: EventType;
  error?: string;
};

export default async function createEventLink(req: NextApiRequest, res: NextApiResponse<Data>) {
  const {
    body: {
      title,
      slug,
      description,
      position,
      locations,
      hidden,
      teamId,
      eventName,
      timeZone,
      periodType,
      periodStartDate,
      periodEndDate,
      periodDays,
      periodCountCalendarDays,
      requiresConfirmation,
      disableGuests,
      minimumBookingNotice,
      beforeEventBuffer,
      afterEventBuffer,
      schedulingType,
      price,
      currency,
      slotInterval,
      metadata,
      length,
    },
    method,
  } = req;
  if (method === "POST") {
    // Process a POST request
    const newEvent = await prisma.eventType.create({
      data: {
        title: `${title}`,
        slug: `${slug}`,
        length: Number(length),
        // description: description as string,
        // position: Number(position),
        // locations: locations,
        // hidden: Boolean(hidden) as boolean,
        // teamId: Number.isInteger(teamId) ? Number(teamId) : null,
        // eventName: eventName,
        // timeZone: timeZone,
        // periodType: periodType,
        // periodStartDate: periodStartDate,
        // periodEndDate: periodEndDate,
        // periodDays: periodDays,
        // periodCountCalendarDays: periodCountCalendarDays,
        // requiresConfirmation: requiresConfirmation,
        // disableGuests: disableGuests,
        // minimumBookingNotice: minimumBookingNotice,
        // beforeEventBuffer: beforeEventBuffer,
        // afterEventBuffer: afterEventBuffer,
        // schedulingType: schedulingType,
        // price: price,
        // currency: currency,
        // slotInterval: slotInterval,
        // metadata: metadata,
      },
    });
    res.status(201).json({ event: newEvent });
  } else {
    // Handle any other HTTP method
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}
