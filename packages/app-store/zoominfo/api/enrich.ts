import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import ZoomInfoService from "../lib/ZoomInfoService";
import type { ZoomInfoEnrichedData } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { bookingUid } = req.body;

  if (!bookingUid || typeof bookingUid !== "string") {
    return res.status(400).json({ message: "bookingUid is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: {
      id: true,
      uid: true,
      userId: true,
      metadata: true,
      attendees: {
        select: {
          email: true,
          name: true,
        },
      },
      eventType: {
        select: {
          userId: true,
          teamId: true,
        },
      },
    },
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const isHost = booking.userId === req.session.user.id;
  if (!isHost) {
    return res.status(403).json({ message: "Only the host can enrich attendee data" });
  }

  const credential = await prisma.credential.findFirst({
    where: {
      userId: req.session.user.id,
      type: "zoominfo_other",
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      teamId: true,
      appId: true,
      invalid: true,
    },
  });

  if (!credential) {
    return res
      .status(400)
      .json({ message: "ZoomInfo is not connected. Please install the ZoomInfo app first." });
  }

  const zoominfoService = new ZoomInfoService({
    credentialId: credential.id,
    credentialKey: credential.key,
    userId: credential.userId,
  });

  const attendeeEmails = booking.attendees.map((a) => a.email);
  const enrichedDataMap = await zoominfoService.enrichContacts(attendeeEmails);

  const enrichedData: Record<string, ZoomInfoEnrichedData> = {};
  enrichedDataMap.forEach((data, email) => {
    enrichedData[email] = data;
  });

  const existingMetadata =
    typeof booking.metadata === "object" && booking.metadata !== null
      ? (booking.metadata as Prisma.JsonObject)
      : {};

  await prisma.booking.update({
    where: { uid: bookingUid },
    data: {
      metadata: {
        ...existingMetadata,
        zoominfoEnrichedData: enrichedData as Prisma.JsonObject,
      },
    },
  });

  return res.status(200).json({
    success: true,
    enrichedCount: enrichedDataMap.size,
    enrichedData,
  });
}
