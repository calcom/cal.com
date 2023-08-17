import type { GetServerSideProps } from "next";
import { z } from "zod";

import { BbbApi, hashAttendee } from "@calcom/app-store/bigbluebutton/lib";
import { bbbOptionsSchema } from "@calcom/app-store/bigbluebutton/lib/bbbApi";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default function AttendeeJoinPage() {}

const paramsSchema = z.object({
  uid: z.string().min(1),
  // adjust this when changing the hashing algorithm
  hash: z.string().length(64),
});

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  let destination = "/404";
  let notFound = false;
  try {
    const { uid, hash } = paramsSchema.parse(params);

    const booking = await prisma.booking.findFirstOrThrow({
      select: {
        uid: true,
        attendees: true,
        references: true,
        title: true,
      },
      where: {
        uid,
        status: BookingStatus.ACCEPTED,
        references: {
          some: {
            type: "bigbluebutton_video",
          },
        },
      },
    });

    const attendee = booking.attendees.find((attendee) => hash === hashAttendee(attendee));
    if (!attendee) throw new Error("There is no attendee with that hash.");

    const credentialId = booking.references.find((ref) => ref.type === "bigbluebutton_video")?.credentialId;
    if (!credentialId) throw new Error("Missing credentialId.");

    const credential = await prisma.credential.findFirstOrThrow({
      select: {
        key: true,
      },
      where: {
        id: credentialId,
      },
    });

    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      throw new Error(`Cal.com encryption key needs to be set.`);
    }
    if (typeof credential.key !== "string") {
      throw new Error(`Unexpected credential key type: ${typeof credential.key}`);
    }

    const bbbOpts = bbbOptionsSchema.parse(
      JSON.parse(symmetricDecrypt(credential.key, process.env.CALENDSO_ENCRYPTION_KEY))
    );

    const bbbApi = new BbbApi(bbbOpts);

    const createResponse = await bbbApi.createMeeting(uid, booking.title);
    if (!createResponse.success) throw new Error("Unable to create meeting.");

    destination = bbbApi.getSignedJoinMeetingUrl(uid, attendee.name || attendee.email || "Default", "VIEWER");
  } catch (error) {
    logger.error(error);
    notFound = true;
  } finally {
    return {
      notFound,
      redirect: {
        destination,
        permanent: false,
      },
    };
  }
};
