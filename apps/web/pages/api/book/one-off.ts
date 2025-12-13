import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

import getIP from "@calcom/lib/getIP";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import { BookingStatus, OneOffMeetingStatus } from "@calcom/prisma/enums";

interface BookOneOffRequest {
  oneOffMeetingId: string;
  slotId: string;
  name: string;
  email: string;
  notes?: string;
  timeZone: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createOneOffBooking:${piiHasher.hash(userIp)}`,
  });

  const { oneOffMeetingId, slotId, name, email, notes, timeZone } = req.body as BookOneOffRequest;

  if (!oneOffMeetingId || !slotId || !name || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Fetch the one-off meeting with the specific slot
  const oneOffMeeting = await prisma.oneOffMeeting.findUnique({
    where: { id: oneOffMeetingId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      status: true,
      offeredSlots: {
        where: { id: slotId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
        },
      },
    },
  });

  if (!oneOffMeeting) {
    return res.status(404).json({ message: "One-off meeting not found" });
  }

  if (oneOffMeeting.status !== OneOffMeetingStatus.ACTIVE) {
    return res.status(400).json({
      message:
        oneOffMeeting.status === OneOffMeetingStatus.BOOKED
          ? "This meeting has already been booked"
          : "This meeting link is no longer available",
    });
  }

  const slot = oneOffMeeting.offeredSlots[0];
  if (!slot) {
    return res.status(400).json({ message: "Selected time slot not found" });
  }

  // Check if slot is in the past
  if (new Date(slot.startTime) < new Date()) {
    return res.status(400).json({ message: "This time slot has passed" });
  }

  const uid = uuidv4();
  const bookingTitle = oneOffMeeting.title;

  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      uid,
      title: bookingTitle,
      startTime: slot.startTime,
      endTime: slot.endTime,
      user: {
        connect: { id: oneOffMeeting.user.id },
      },
      attendees: {
        create: {
          name,
          email,
          timeZone,
        },
      },
      status: BookingStatus.ACCEPTED,
      description: notes || null,
      location: oneOffMeeting.location ? JSON.stringify(oneOffMeeting.location) : null,
    },
    select: {
      id: true,
      uid: true,
    },
  });

  // Update the one-off meeting status to BOOKED
  await prisma.oneOffMeeting.update({
    where: { id: oneOffMeetingId },
    data: {
      status: OneOffMeetingStatus.BOOKED,
      bookedAt: new Date(),
      bookingId: booking.id,
    },
  });

  // TODO: Add email notifications using the proper Cal.com email infrastructure

  return res.status(200).json({
    success: true,
    uid: booking.uid,
    id: booking.id,
  });
}

export default defaultResponder(handler, "/api/book/one-off");
