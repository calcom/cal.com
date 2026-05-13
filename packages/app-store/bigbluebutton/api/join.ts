import process from "node:process";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import appConfig from "../config.json";
import { BBBApi } from "../lib/bbbapi";
import { bbbEncryptedSchema, bbbOptionsSchema, Role } from "../lib/types";

async function joinHandler(req: NextApiRequest, res: NextApiResponse) {
  const { meetingID } = req.query;
  if (!meetingID || typeof meetingID !== "string")
    throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  const user = req.session?.user;
  if (!user?.id || !user.email) {
    throw new HttpError({ statusCode: 401, message: "Authentication required" });
  }

  const data = await prisma.bookingReference.findFirst({
    where: {
      type: appConfig.type,
      uid: meetingID,
    },
    select: {
      credential: {
        select: {
          key: true,
        },
      },
      booking: {
        select: {
          status: true,
          title: true,
          eventType: {
            select: {
              userId: true,
              team: {
                select: {
                  members: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
          attendees: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!data || !data.booking || !data.credential)
    throw new HttpError({ statusCode: 400, message: "Meeting not found" });

  // Validate booking status - only allow joining accepted bookings
  if (data.booking.status !== BookingStatus.ACCEPTED)
    throw new HttpError({ statusCode: 400, message: "Booking is not confirmed" });

  const userEmail = user.email.toLowerCase();
  const isOwner =
    data.booking.eventType?.userId === user.id ||
    data.booking.eventType?.team?.members?.some((member) => member.userId === user.id);
  const isAttendee = data.booking.attendees.some((attendee) => attendee.email.toLowerCase() === userEmail);

  if (!isOwner && !isAttendee) {
    throw new HttpError({ statusCode: 403, message: "You are not authorized to join this meeting" });
  }

  const parsedKey = bbbEncryptedSchema.safeParse(data.credential.key);
  if (!parsedKey.success) throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    throw new HttpError({ statusCode: 500, message: "Missing encryption key" });
  }

  const decryptedOptions = symmetricDecrypt(parsedKey.data.private, process.env.CALENDSO_ENCRYPTION_KEY);
  const bbbOptions = bbbOptionsSchema.safeParse(JSON.parse(decryptedOptions));
  if (!bbbOptions.success) throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  const bbb = new BBBApi(bbbOptions.data);
  const meeting = await bbb.createMeeting(meetingID, data.booking.title);
  if (!meeting.success) throw new HttpError({ statusCode: 500, message: "Could not create meeting" });

  const role = isOwner ? Role.MODERATOR : Role.VIEWER;
  const named = isOwner
    ? user.name || "Host"
    : data.booking.attendees.find((attendee) => attendee.email.toLowerCase() === userEmail)?.name ||
      user.email;

  const joinData = await bbb.joinMeeting(meetingID, named, role);
  if (!joinData.success) throw new HttpError({ statusCode: 500, message: "Could not join meeting" });

  res.redirect(joinData.data.url);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(joinHandler) }),
});
