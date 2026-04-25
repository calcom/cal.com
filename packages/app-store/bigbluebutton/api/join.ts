import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { BBBApi } from "../lib/bbbapi";
import { bbbEncryptedSchema, bbbOptionsSchema, Role } from "../lib/types";

async function joinHandler(req: NextApiRequest, res: NextApiResponse) {
  const { meetingID } = req.query;
  if (!meetingID || typeof meetingID !== "string")
    throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  const data = await prisma.bookingReference.findFirstOrThrow({
    where: {
      type: "bigbluebutton_video",
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

  if (data.booking.status !== BookingStatus.ACCEPTED)
    throw new HttpError({ statusCode: 400, message: "Booking is not confirmed" });

  const sessionUserId = req.session?.user?.id;
  const isOwner =
    !!sessionUserId &&
    (data.booking.eventType?.userId === sessionUserId ||
      !!data.booking.eventType?.team?.members?.some((member) => member.userId === sessionUserId));

  const parsedKey = bbbEncryptedSchema.safeParse(data.credential.key);
  if (!parsedKey.success) throw new HttpError({ statusCode: 400, message: "Invalid meeting configuration" });

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    throw new HttpError({ statusCode: 500, message: "Missing encryption key" });
  }

  let decryptedJson: unknown;
  try {
    const decryptedOptions = symmetricDecrypt(parsedKey.data.private, process.env.CALENDSO_ENCRYPTION_KEY);
    decryptedJson = JSON.parse(decryptedOptions);
  } catch {
    throw new HttpError({ statusCode: 400, message: "Invalid meeting configuration" });
  }
  const bbbOptions = bbbOptionsSchema.safeParse(decryptedJson);
  if (!bbbOptions.success)
    throw new HttpError({ statusCode: 400, message: "Invalid meeting configuration" });

  const bbb = new BBBApi(bbbOptions.data);
  if (!(await bbb.checkValidOptions()))
    throw new HttpError({ statusCode: 400, message: "Invalid BigBlueButton configuration" });

  const create = await bbb.createMeeting(meetingID, data.booking.title);
  if (!create.success)
    throw new HttpError({ statusCode: 500, message: create.message ?? "Could not create meeting" });

  const role = isOwner ? Role.MODERATOR : Role.VIEWER;
  const named = isOwner
    ? req.session?.user?.name || "Host"
    : data.booking.attendees.find((attendee) => attendee.email === req.session?.user?.email)?.name ||
      req.session?.user?.email ||
      "Guest";

  const join_data = await bbb.joinMeeting(meetingID, named, role);
  if (!join_data?.success) throw new HttpError({ statusCode: 500, message: "Could not join meeting" });

  res.redirect(join_data.data.url);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(joinHandler) }),
});
