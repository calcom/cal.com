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

  // that's deep.
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
        where: {
          status: BookingStatus.ACCEPTED,
        },
        select: {
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

  const isOwner =
    data?.booking.eventType?.userId === req.session?.user?.id ||
    data?.booking.eventType?.team?.members?.some((member) => member.userId === req.session?.user?.id);

  const parsedKey = bbbEncryptedSchema.safeParse(data.credential.key);
  if (!parsedKey.success) throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    throw new HttpError({ statusCode: 500, message: "Missing encryption key" });
  }

  const decryptedOptions = symmetricDecrypt(parsedKey.data.private, process.env.CALENDSO_ENCRYPTION_KEY);
  const bbbOptions = bbbOptionsSchema.safeParse(JSON.parse(decryptedOptions));
  if (!bbbOptions.success) throw new HttpError({ statusCode: 400, message: "Invalid meeting ID" });

  const bbb = new BBBApi(bbbOptions.data);
  if (!(await bbb.checkValidOptions()))
    throw new HttpError({ statusCode: 400, message: "Invalid BigBlueButton options" });

  await bbb.createMeeting(meetingID, data.booking.title);

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
