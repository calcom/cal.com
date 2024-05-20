import type { NextApiRequest } from "next";

import { getAllTranscriptsAccessLinkFromRoomName } from "@calcom/core/videoClient";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { references: true },
  });

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  if (!roomName)
    throw new HttpError({
      statusCode: 404,
      message: `No Cal Video reference found with booking id ${booking.id}`,
    });

  const transcripts = await getAllTranscriptsAccessLinkFromRoomName(roomName);

  return transcripts;
}

export default defaultResponder(getHandler);
