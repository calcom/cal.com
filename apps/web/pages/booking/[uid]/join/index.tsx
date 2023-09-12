import type { GetServerSideProps } from "next";
import { z } from "zod";

import { BbbApi } from "@calcom/app-store/bigbluebutton/lib";
import { bbbOptionsSchema } from "@calcom/app-store/bigbluebutton/lib/bbbApi";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default function OrganizerJoinPage() {}

const paramsSchema = z.object({
  uid: z.string().min(1),
});

export const getServerSideProps: GetServerSideProps = async ({ req, res, params }) => {
  let destination = "/404";
  let notFound = false;
  try {
    const session = await getServerSession({ req, res });
    if (!session?.user.id) throw new Error("No session.");

    const { uid } = paramsSchema.parse(params);

    const booking = await prisma.booking.findFirstOrThrow({
      select: {
        uid: true,
        references: true,
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

    const isOwner = booking.eventType?.userId === session.user.id;
    const isTeamMember = booking.eventType?.team?.members.some(({ userId }) => userId === session.user.id);

    if (!isOwner && !isTeamMember) throw new Error("User should not be a moderator.");

    const bbbApi = new BbbApi(bbbOpts);

    const createResponse = await bbbApi.createMeeting(uid, booking.title);
    if (!createResponse.success) throw new Error("Unable to create meeting.");

    destination = bbbApi.getSignedJoinMeetingUrl(
      uid,
      session.user.name || session.user.email || "Host",
      "MODERATOR"
    );
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
